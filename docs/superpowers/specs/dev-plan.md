# Wayvy — Development Plan

**Date:** 2026-05-15  
**Target:** TestFlight MVP

---

## Вводные (изменения относительно базового спека)

### Auth: SMS OTP вместо email/password
- Вход через номер телефона → SMSAero отправляет 4-значный код → пользователь вводит → JWT
- Поле `email` в таблице `users` заменяется на `phone` (E.164: `+79161234567`)
- Никакого пароля — только телефон как идентификатор
- Сервис: [smsaero.ru](https://smsaero.ru/integration/documentation/api/)
- Ключи: в `.env` (переменные `SMSAERO_EMAIL` + `SMSAERO_API_KEY`)

### Карты: Yandex MapKit
- iOS SDK: [документация](https://yandex.ru/maps-api/docs/mapkit/ios/generated/getting_started.html)
- Ключ: в Xcode xcconfig как `YANDEX_MAPKIT_KEY` (не в коде, не в git)
- Активация: `YMKMapKit.setApiKey(key)` в `App.init()` до первого MapView

---

## Параллельные треки

```
Track A: iOS (Swift)          Track B: Backend (Go)
──────────────────────        ──────────────────────
Phase 1: Foundation           Phase 1: Foundation
Phase 2: SMS Auth (UI)   ←→  Phase 2: user-service + SMSAero
Phase 3: Map + GPS       ←→  Phase 3: route-service
Phase 4: Waypoints       ←→  Phase 4: media-service
Phase 5: Social          ←→  Phase 5: follow graph + feed
Phase 6: Events          ←→  Phase 6: event-service
```

Точки синхронизации помечены ←→. Перед переходом к следующей фазе убеждаемся что оба трека на одном уровне.

---

## Phase 1 — Foundation

### Track A: iOS

**Задачи:**
1. Создать Xcode проект: `Wayvy`, target iOS 17+, Swift 6, SwiftUI lifecycle
2. Структура папок согласно Swift-скиллу (`Views/`, `ViewModels/`, `Services/`, `Models/`, `DesignSystem/`)
3. `DesignSystem/Colors.swift` — все токены из `design-system/colors_and_type.css`
4. `DesignSystem/Typography.swift` — Font extensions (SF Pro)
5. `DesignSystem/Spacing.swift` — CGFloat constants
6. Добавить Yandex MapKit через SPM / CocoaPods, настроить xcconfig с ключом
7. `AppState.swift` — `@Observable`, `@MainActor`: `isAuthenticated`, `currentUser`, `selectedTab`
8. `ContentView.swift` — `TabView` 4 таба + `RecordFAB` floating (пустые экраны-заглушки)
9. Настроить `Info.plist`: Location `WhenInUse` + `Always`, Camera, Microphone, PhotoLibrary

**Результат фазы:** приложение запускается, показывает 4 таба с пустыми экранами, MapKit инициализирован.

---

### Track B: Backend

**Задачи:**
1. Создать `backend/` в корне репо
2. `docker-compose.yml` — postgres (postgis/postgis:16-3.4), redis:7-alpine, nginx
3. `backend/user-service/` — Go модуль, chi router, базовый healthcheck `/health`
4. Миграции в `backend/user-service/migrations/`:
   - `0001_initial.sql` — расширения + все таблицы + индексы (см. Go-скилл)
   - **Внимание:** `users.phone TEXT UNIQUE` вместо `users.email` из базового спека
5. `backend/nginx/nginx.conf` — роутинг по prefix, заглушка JWT-проверки
6. `Makefile` в `backend/`: `make up`, `make migrate`, `make logs`

**Изменённая схема users:**
```sql
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone      TEXT UNIQUE NOT NULL,   -- E.164: +79161234567
    username   TEXT UNIQUE,            -- выбирается после первого входа
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Результат фазы:** `docker compose up` поднимает всё, миграции проходят, `/health` отвечает 200.

---

## Phase 2 — SMS Auth ←→

### Track A: iOS — Auth UI

**Задачи:**
1. `AuthService.swift` actor — `requestOTP(phone:)`, `verifyOTP(phone:code:)`
2. `PhoneInputView` — поле ввода телефона, кнопка «Получить код»
   - Формат: маска +7 (XXX) XXX-XX-XX
   - SF Symbol: `phone.fill`
3. `OTPInputView` — 4 цифры, автофокус, автосабмит при вводе 4-й цифры
   - Таймер обратного отсчёта «Отправить снова через 60 с»
4. После успешного OTP: сохранить JWT в Keychain, перейти на `ContentView`
5. При первом входе (нет username): показать `UsernameSetupView`

**Дизайн:**
- Экраны логина: coral hero с белым логотипом Wayvy (см. `LoginScreen.jsx`)
- Кнопка «Получить код» — primary coral button, radius 14
- OTP поля — 4 квадрата 56×56, border-radius 12, акцент border при фокусе

---

### Track B: Backend — user-service + SMSAero

**SMSAero API:**
```
Base URL: https://gate.smsaero.ru/v2/
Auth: Basic base64(email:api_key)
Send SMS: POST /sms/send
  { "number": "79161234567", "text": "Код Wayvy: 1234", "sign": "SMS Aero" }
```

**Задачи:**
1. `backend/user-service/internal/smsaero/client.go` — HTTP клиент SMSAero
   ```go
   type Client struct {
       email  string
       apiKey string
       http   *http.Client
   }
   func (c *Client) SendOTP(ctx context.Context, phone, code string) error
   ```
2. Redis для хранения OTP:
   ```
   key: "otp:{phone}"   value: "1234"   TTL: 5 min
   ```
3. Endpoints:
   - `POST /auth/otp/request` — принять `{phone}`, сгенерировать 4-значный код, сохранить в Redis, отправить через SMSAero
   - `POST /auth/otp/verify` — принять `{phone, code}`, проверить Redis, вернуть JWT
4. `POST /auth/otp/request` — rate limit: 1 запрос в 60 секунд на номер (Redis: `otp_rl:{phone}` TTL 60s)
5. JWT генерация: `github.com/golang-jwt/jwt/v5`, payload `{user_id, exp}`
6. Nginx: пути `/auth/*` проксируются на user-service **без** JWT-проверки (это публичные эндпоинты)

**Тестирование с SMSAero:**
- Test ключ: OTP появляется в дашборде SMSAero, реальный SMS не отправляется
- Prod ключ: реальный SMS на номер

---

## Phase 3 — Map + GPS ←→

### Track A: iOS — Карта + запись

**Задачи:**
1. `LocationService.swift` — Swift actor, CoreLocation delegate, `startRecording()`, `stopRecording() → [CLLocationCoordinate2D]`
2. `MapBrowseView` — YMKMapView через UIViewRepresentable:
   - Синяя точка «я здесь» (MeDot)
   - Свои маршруты: coral полилиния 4pt
   - Маршруты подписок: teal полилиния 3pt
   - `ControlStack` (locate + layers) — правый край
   - `SearchPill` — top, открывает `SearchOverlay`
3. `RecordingView`:
   - Карта на весь экран
   - `RecordingHUD` floating: время `00:00`, дистанция `0,0 км`, кнопка `+ Точка`, кнопка `■ Стоп`
   - Реалтайм полилиния растёт по мере движения
4. `StopConfirmSheet` — сохранить / отменить / продолжить
5. `CLGeocoder` → определение города по первой точке трека

**Синхронизация с бэком:** нужны эндпоинты `POST /routes` и `GET /routes` (Phase 3B)

---

### Track B: Backend — route-service

**Задачи:**
1. `backend/route-service/` — Go модуль, chi router
2. Endpoints:
   - `POST /routes` — создать маршрут (принять GeoJSON LineString, waypoints[])
   - `GET /routes` — мои маршруты (auth required)
   - `GET /routes/{id}` — один маршрут
   - `DELETE /routes/{id}` — удалить (только автор)
   - `GET /routes/feed` — маршруты подписок (pagination: `?limit=20&offset=0`)
3. PostGIS: вставка LineString, расчёт `distance_m` через `ST_Length(gps_track::geography)`
4. Visibility SQL enforcement (см. Go-скилл)
5. Nginx: добавить `location /routes/` и `location /waypoints/`

---

## Phase 4 — Waypoints + Media ←→

### Track A: iOS — WaypointSheet + фото

**Задачи:**
1. `WaypointSheetView` — bottom sheet, два режима (`standalone` / `inline`):
   - `PhotosPicker` — мультивыбор, показ превью, обложка
   - `YandexService.geocodeReverse()` — автозаполнение адреса
   - `YandexService.nearbyPlaces()` — список мест рядом
   - Поля: заголовок, описание, видимость
2. `MediaService.swift` — compress → `POST /media/upload` → получить `{r2_key, url}`
3. Загрузка фото до сабмита waypoint (параллельные uploads через `withThrowingTaskGroup`)
4. `WaypointBubble` на карте — 52pt rounded-square, тип-badge в top-left

---

### Track B: Backend — waypoints + media-service

**Задачи:**
1. Waypoint endpoints в route-service:
   - `POST /waypoints` — создать (route_id nullable)
   - `GET /waypoints/{id}`
   - `GET /routes/{id}/waypoints`
   - `GET /waypoints/nearby?lat=&lon=&radius_m=` — PostGIS ST_DWithin
2. `backend/media-service/`:
   - `POST /media/upload` — multipart → resize 1080px → JPEG 80% → R2 PutObject
   - Вернуть `{r2_key, url}`
   - Зависимость: `github.com/disintegration/imaging` или `golang.org/x/image`
3. Nginx: добавить `location /media/`

---

## Phase 5 — Social ←→

### Track A: iOS — профиль + подписки

**Задачи:**
1. `ProfileView` — собственный профиль (`who: .own`) + чужой (`who: .user(id)`)
   - Coral cover, аватар, имя, username, город, bio, stats
   - Сегменты: Маршруты / События
   - `ProfileCityFilter` sticky chips
2. `FollowButton` — состояния: Подписаться / Подписан ✓ / Запрошено
3. `SubscriptionsMapView` (Карта·все):
   - `WaypointBubble` пины — route-linked (coral badge) / standalone (dark badge)
   - `SMapCreatePointPill` — `+ Точка`
   - `SMapLegend` — bottom-left
   - Тап на route-linked → highlight polyline → `FriendRouteSteps`
   - Тап на standalone → `WaypointDetailSheet`
4. `SearchOverlay` — сегменты Маршруты / Люди

---

### Track B: Backend — follow graph + feed

**Задачи:**
1. user-service endpoints:
   - `POST /users/{id}/follow`
   - `DELETE /users/{id}/follow`
   - `GET /users/{id}/followers`
   - `GET /users/{id}/following`
   - `GET /users/search?q=`
2. Redis cache follow graph: `followers:{user_id}` SET, TTL 5 min
3. `GET /routes/feed` — маршруты подписок с visibility enforcement
4. `GET /waypoints/map` — waypoints подписок в bbox (для Карта·все):
   ```
   ?bbox=lon_min,lat_min,lon_max,lat_max
   ```

---

## Phase 6 — Events ←→

### Track A: iOS — события

**Задачи:**
1. `EventsView` — лента предстоящих событий, `EventCard`
2. `EventCreateSheet` — cover, title, date chip, time chip, place (mini-map + «Передвинуть»), description, visibility (Публично / Подписчики), CTA «Создать событие»
3. `EventDetailScreen` — карта с `EventMapPin` (dark rounded-square + coral day), bottom sheet
4. `EventMapPin` на карте в `MapBrowseView`
5. Кнопка «Иду» — coral fill → checked outline

---

### Track B: Backend — event-service

**Задачи:**
1. `backend/event-service/`:
   - `POST /events`
   - `GET /events` — лента (upcoming, visibility enforcement)
   - `GET /events/{id}`
   - `DELETE /events/{id}`
   - `GET /events/nearby?lat=&lon=&radius_m=&from=` — PostGIS + time filter
   - `POST /events/{id}/attend`
   - `DELETE /events/{id}/attend`
2. **Constraint:** `visibility IN ('public', 'followers')` — never `private`
3. Nginx: добавить `location /events/`

---

## Контексты для отдельных чатов

### Контекст для iOS-чата
```
Репозиторий: https://github.com/cooljekee/wayvy
Скилл: .claude/skills/wayvy-swift-developer.md
Текущая фаза: [указать Phase N]
Задача: [указать конкретную задачу из трека A]

Вводные:
- Yandex MapKit key: в xcconfig, переменная YANDEX_MAPKIT_KEY
- Auth: SMS OTP через user-service /auth/otp/request + /auth/otp/verify
- Дизайн-система: design-system/ui_kits/ios/ — все компоненты уже есть в JSX, переносим в SwiftUI
```

### Контекст для Go-чата
```
Репозиторий: https://github.com/cooljekee/wayvy
Скилл: .claude/skills/wayvy-go-developer.md
Текущая фаза: [указать Phase N]
Задача: [указать конкретную задачу из трека B]

Вводные:
- SMSAero: SMSAERO_EMAIL + SMSAERO_API_KEY из .env (см. .env.example)
- Auth flow: phone → OTP в Redis TTL 5min → verify → JWT
- users.phone вместо users.email (изменение относительно базового спека)
- Все ключи только через os.Getenv(), никаких хардкодов
```

---

## Порядок старта

1. **Оба трека одновременно** → Phase 1 (Foundation)
2. **Синхронизация** → убеждаемся что инфраструктура поднята, iOS запускается
3. **Оба трека** → Phase 2 (Auth) — самая важная точка синхронизации
4. Дальше параллельно по фазам с промежуточными точками синхронизации
