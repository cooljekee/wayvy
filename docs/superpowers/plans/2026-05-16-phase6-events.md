# Phase 6 — Events (Backend + iOS)

**Дата:** 2026-05-16  
**Статус:** В работе  
**Исполнитель:** Senior Dev (subagent-driven-development)

---

## Контекст

Что уже есть к началу фазы:

| Готово | Описание |
|---|---|
| user-service | Auth (SMS OTP), JWT, follow graph, profiles |
| route-service | Маршруты, waypoints, nearby, map feed |
| media-service | Upload → R2 |
| iOS Auth | PhoneInputView, OTPInputView, UsernameSetupView |
| iOS Map | MapBrowseView, YandexMapView, RecordingView |
| iOS Waypoints | WaypointSheetView, WaypointBubble |
| DB schema | Таблица `events` уже создана в migration 0001_initial |

---

## Scope Phase 6

### Backend: event-service (port 8083)

Самостоятельный Go-сервис с chi router. Данные хранятся в той же Postgres БД (shared с другими сервисами). Читает `X-User-ID` из Nginx.

**API contract:**

```
POST   /events                           → 201 Event
GET    /events?limit=&offset=            → 200 { items, total }
GET    /events/{id}                      → 200 Event
DELETE /events/{id}                      → 204 (автор)
GET    /events/nearby?lat=&lon=&radius_m=&from= → 200 { items }
POST   /events/{id}/attend               → 200
DELETE /events/{id}/attend               → 204
GET    /events/{id}/attendees            → 200 { items: [User] }
GET    /health                           → 200 ok
```

**Event JSON (всегда lon,lat GeoJSON):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Закат на Воробьёвых",
  "description": "...",
  "cover_url": "https://r2.../photos/uuid.jpg",
  "location": { "type": "Point", "coordinates": [37.55, 55.69] },
  "address": "Смотровая · Воробьёвы горы",
  "starts_at": "2026-05-18T17:42:00Z",
  "ends_at": null,
  "visibility": "public",
  "attend_count": 17,
  "is_attending": false,
  "created_at": "..."
}
```

**Ограничения:**
- `visibility` только `public` или `followers` — никогда `private` (БД CONSTRAINT + handler validation)
- `attend_count` вычисляется в запросе через COUNT(*)
- Visibility enforcement: `followers` события видны только подписчикам автора

### Backend: Nginx

Добавить `/events/` → event-service с JWT enforcement (auth_request).

### iOS

| Файл | Описание |
|---|---|
| `Services/EventService.swift` | Actor: fetchEvents, createEvent, attend, unattend |
| `Views/Events/EventsView.swift` | Лента предстоящих событий, EventCard с amber акцентом |
| `Views/Events/EventCreateSheet.swift` | Bottom sheet создания: обложка, заголовок, дата/время, карта, видимость |
| `Views/Events/EventDetailScreen.swift` | Полноэкранный просмотр: карта + EventMapPin + bottom sheet + «Иду» |

---

## Поэтапная реализация (subagent-driven-development)

### Задача 1: event-service scaffold
**Коммит:** `feat(event-service): Go module, chi router, JWT middleware`

Создать:
```
backend/event-service/
├── Dockerfile            (порт 8083, alpine builder)
├── go.mod                (module github.com/cooljekee/wayvy/event-service)
├── main.go               (chi router + graceful shutdown + DB pool)
└── internal/
    ├── handler/
    │   ├── health.go
    │   └── respond.go
    └── middleware/
        └── auth.go       (X-User-ID → context, идентично route-service)
```

Обновить:
- `docker-compose.yml` — добавить event-service (порт 8083, DATABASE_URL)
- Nginx `/events/` пока оставить заглушкой (обновим в задаче 4)

---

### Задача 2: Events CRUD
**Коммит:** `feat(event-service): events CRUD with visibility constraint`

Добавить миграцию `0003_events_cover_attendees` в `user-service/migrations/`:
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_url TEXT;
CREATE TABLE IF NOT EXISTS event_attendees (...);
```

Создать:
```
backend/event-service/internal/
├── model/event.go        (Event struct, CreateEventInput, AttendeeUser)
├── store/event.go        (Create, List, GetByID, Delete, ListAttendees)
├── service/event.go      (бизнес-логика, visibility enforcement)
└── handler/event.go      (POST /events, GET /events, GET /{id}, DELETE /{id})
```

**Visibility SQL enforcement для GET /events:**
```sql
WHERE starts_at > NOW()
  AND (
    visibility = 'public'
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = $viewer_id AND following_id = user_id
    ))
    OR user_id = $viewer_id
  )
```

---

### Задача 3: Geo + Attend
**Коммит:** `feat(event-service): nearby geo query + attend endpoints`

Добавить в store/service/handler:
- `GET /events/nearby` — PostGIS ST_DWithin + starts_at >= from (defaults NOW())
- `POST /events/{id}/attend` — INSERT INTO event_attendees (ON CONFLICT DO NOTHING)
- `DELETE /events/{id}/attend` — DELETE FROM event_attendees
- `GET /events/{id}/attendees` — JOIN users, limit 50

---

### Задача 4: Nginx
**Коммит:** `feat(nginx): event-service proxy`

Заменить заглушку `/events/` на реальный proxy с auth_request:
```nginx
location /events/ {
    auth_request      /auth/validate;
    auth_request_set  $x_user_id $upstream_http_x_user_id;
    proxy_pass        http://event_service;
    proxy_set_header  X-User-ID $x_user_id;
    ...
}
```

Добавить upstream `event_service { server event-service:8083; }`.

Добавить event-service в depends_on в docker-compose nginx.

---

### Задача 5: iOS EventService.swift
**Коммит:** `feat(ios): EventService — fetch, create, attend`

```swift
actor EventService {
    func fetchEvents(limit: Int, offset: Int) async throws -> [EventResponse]
    func fetchNearby(lat: Double, lon: Double, radiusM: Int) async throws -> [EventResponse]
    func createEvent(title:description:coverURL:lat:lon:address:startsAt:visibility:) async throws -> EventResponse
    func attend(eventID: UUID) async throws
    func unattend(eventID: UUID) async throws
}

struct EventResponse: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let title: String
    let description: String
    let coverUrl: String?
    let location: GeoJSONPoint
    let address: String
    let startsAt: Date
    let endsAt: Date?
    let visibility: String
    let attendCount: Int
    let isAttending: Bool
    let createdAt: Date
}
```

Shared `GeoJSONPoint` struct (lon, lat order).

---

### Задача 6: iOS EventsView + EventCard
**Коммит:** `feat(ios): EventsView + EventCard — events feed`

```
EventsView — VStack: toolbar «+ Создать», LazyVStack EventCard, пустое состояние
EventCard — amber дата-чип (#F4B740 текст + dark bg #0E1116), обложка/градиент,
            название, место, «идут N», CTA «Иду» coral
```

Дизайн из `EventSheets.jsx`:
- Дата-чип: `#0E1116` bg, `#8A93A4` месяц, `#FF5A4E` день числом
- Amber (`#F4B740`) только для иконки «Событие» и category badge, не как основной цвет чипа
- Radius карточки: 16 (radiusLg)
- Padding: 16 (sp4)

Подключить в `ContentView.swift` — заменить заглушку таба «События» на `EventsView()`.

---

### Задача 7: iOS EventCreateSheet.swift
**Коммит:** `feat(ios): EventCreateSheet — create event with map location`

Bottom sheet по дизайну из `EventSheets.jsx`:
- Grip + «Новое событие» header + `ECVisibilityPill` (Публично/Подписчики, не Только я)
- Обложка: `PhotosPicker` → upload через `MediaService` → `cover_url`
- Поля: название, дата (DatePicker chip), время, место (TextEditor) + мини-карта YMK
- Видимость: toggle Публично / Подписчики
- CTA «Создать событие» coral, disabled пока нет названия
- `presentationDetents([.large])`, `presentationCornerRadius(28)`

---

### Задача 8: iOS EventDetailScreen.swift
**Коммит:** `feat(ios): EventDetailScreen — event detail + attend action`

Full-screen sheet:
- `YandexMapView` с `EventMapPin` — dark rounded-square + amber месяц + coral день
- Top bar: кнопка «назад» + автор (аватар + «автор события») + share
- Bottom sheet (`.presentationDetents([.medium, .large])`):
  - Обложка с датой-чипом внутри (время + место как glass-chips поверх)
  - Название + VisibilityBadge + «N км от тебя»
  - Описание
  - Стек attendees + «идут N»
  - CTA «Иду» (coral fill) → при `isAttending=true`: outline с галочкой

---

## Архитектурные решения

1. **event_attendees** создаётся в `user-service/migrations/0003` — все DDL в одном месте
2. **cover_url** — добавляется в события через migration 0003 (`ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_url TEXT`)
3. **attend_count + is_attending** — вычисляются в SQL (не в application code):
   ```sql
   COUNT(ea.user_id) AS attend_count,
   BOOL_OR(ea.user_id = $viewer_id) AS is_attending
   FROM events e
   LEFT JOIN event_attendees ea ON ea.event_id = e.id
   ```
4. **iOS EventMapPin** — отдельный ViewModifier/View, используется и в `EventsView` и в `EventDetailScreen`
5. **GeoJSONPoint** — общий Codable struct в `Models/` (lon, lat order)

---

## Чеклист (Go-скилл)

- [ ] PostGIS индексы используются в geo-запросах
- [ ] Visibility enforcement в SQL, не в app code
- [ ] Events не могут иметь `visibility = 'private'`
- [ ] JWT извлекается из X-User-ID (Nginx), не re-validate
- [ ] Structured error JSON `{"error":..., "code":...}`
- [ ] Context propagated handler → service → store
- [ ] GeoJSON координаты в порядке lon, lat

## Чеклист (Swift-скилл)

- [ ] Все цвета через `Color.wv*`
- [ ] Все отступы через `.sp*`
- [ ] Все радиусы из allowed set
- [ ] Bottom sheets с `presentationCornerRadius(28)`
- [ ] Кнопки «Иду» / «Создать» min 44pt
- [ ] Swift 6 strict concurrency
- [ ] Все строки — русский, `ты` форма
- [ ] EventCard: dark date chip (не amber bg), amber только для иконки
- [ ] Видимость событий: только Публично / Подписчики (не Только я)
