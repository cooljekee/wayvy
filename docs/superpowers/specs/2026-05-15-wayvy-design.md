# Wayvy — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## Overview

Wayvy — социальная сеть для городских прогулок и путешествий. Пользователи записывают GPS-маршруты, ставят точки интереса с фото и описанием, создают мероприятия. Карта показывает маршруты подписок и события рядом — чтобы гуляя с друзьями быстро найти место для досуга.

---

## Tech Stack

| Слой | Технология |
|---|---|
| iOS | Swift 6 + SwiftUI |
| Карты | Yandex MapKit Mobile SDK |
| Геокодинг | Yandex Geocoder API (адрес ↔ координаты) |
| Места | Yandex Places HTTP API (заведения рядом) |
| GPS | CoreLocation (Apple, бесплатно) |
| Бэкенд | Go микросервисы |
| Gateway | Nginx (роутинг, JWT-проверка, rate limiting) |
| База данных | PostgreSQL + PostGIS |
| Кэш | Redis |
| Хранилище фото | Cloudflare R2 (S3-совместимый) |
| Деплой | Ubuntu VPS + Docker Compose |

---

## Architecture

```
iOS App (Swift/SwiftUI)
        ↕ HTTPS/REST
   API Gateway (Nginx)
        ↓
┌─────────────────────────────────────────┐
│ user-service │ route-service │ event-service │ media-service │
│ auth/JWT     │ GPS/PostGIS   │ geo queries   │ photo upload  │
└─────────────────────────────────────────┘
        ↓
PostgreSQL+PostGIS | Redis | Cloudflare R2
```

### Микросервисы

- **user-service** — регистрация, вход (JWT), профиль, подписки (follow/unfollow)
- **route-service** — CRUD маршрутов, waypoints, GPS-треков; геозапросы PostGIS
- **event-service** — CRUD событий, геофильтр «рядом», фильтр по времени
- **media-service** — загрузка фото → сжатие → R2; выдача presigned URLs

---

## Data Model

### users
```sql
id          UUID PK
email       TEXT UNIQUE
username    TEXT UNIQUE
avatar_url  TEXT
created_at  TIMESTAMPTZ
```

### follows
```sql
follower_id  UUID FK → users
following_id UUID FK → users
created_at   TIMESTAMPTZ
PRIMARY KEY (follower_id, following_id)
```

### routes
```sql
id           UUID PK
user_id      UUID FK → users
title        TEXT        -- nullable; автогенерация: "Маршрут 15 мая" если не задан
city         TEXT        -- определяется через Apple CLGeocoder (бесплатно) по стартовой точке
gps_track    GEOMETRY(LineString, 4326)   -- PostGIS; отправляется целиком при остановке записи
distance_m   INT
duration_s   INT
visibility   ENUM('public','followers','private')
started_at   TIMESTAMPTZ
finished_at  TIMESTAMPTZ
created_at   TIMESTAMPTZ
```

> **GPS-запись:** iOS буферит координаты CoreLocation в памяти каждые 5 секунд. При нажатии «Стоп» собирает полный массив точек, строит LineString и отправляет один POST на route-service.

### waypoints
```sql
id               UUID PK
route_id         UUID FK → routes
title            TEXT
description      TEXT
location         GEOMETRY(Point, 4326)    -- PostGIS
address          TEXT                     -- из Яндекс Геокодера
place_name       TEXT                     -- из Яндекс Places (опционально)
place_yandex_id  TEXT
place_category   TEXT                     -- bar, cafe, park, ...
order_index      INT
created_at       TIMESTAMPTZ
```

### photos
```sql
id           UUID PK
waypoint_id  UUID FK → waypoints
r2_key       TEXT
url          TEXT
order_index  INT
created_at   TIMESTAMPTZ
```

### events
```sql
id          UUID PK
user_id     UUID FK → users
title       TEXT
description TEXT
location    GEOMETRY(Point, 4326)
address     TEXT
starts_at   TIMESTAMPTZ
ends_at     TIMESTAMPTZ
visibility  ENUM('public','followers','private')
created_at  TIMESTAMPTZ
```

### Индексы PostGIS
```sql
CREATE INDEX idx_waypoints_location ON waypoints USING GIST (location);
CREATE INDEX idx_events_location    ON events    USING GIST (location);
CREATE INDEX idx_events_starts_at   ON events    (starts_at);
CREATE INDEX idx_routes_user_id     ON routes    (user_id);
```

---

## App Navigation

**Tab Bar:**
1. 🗺 **Карта** — маршруты (свои + подписки) и события на карте; фильтр по видимости
2. ⏺ **Запись** — активный GPS-трекинг; кнопка «+» для добавления точки
3. 📅 **События** — лента событий + создать событие
4. 👤 **Профиль** — мои маршруты, мои события, подписки/подписчики

---

## Key User Flow — запись маршрута

```
Карта → "Начать маршрут"
  → Экран записи (GPS пишет LineString)
    → Тап "+" → Модалка точки:
        - GPS-координата фиксируется сразу
        - Яндекс Геокодер → адрес (1 запрос)
        - Яндекс Places → список мест рядом (1 запрос)
        - Пользователь: фото + заголовок + описание + выбор места
        - Сохранить → waypoint записан, продолжаем запись
  → "Стоп" → маршрут сохранён → виден на карте
```

---

## Yandex Maps — лимиты и использование

| API | Бесплатно | Использование в приложении |
|---|---|---|
| MapKit Mobile SDK | ✅ Включено в SDK | Отображение карты, пины, полилинии |
| Geocoder API | 500 req/day | 1 запрос при создании каждой точки (адрес waypoint) |
| Places HTTP API | 500 req/day | 1 запрос при открытии модалки точки |

GPS-трекинг и определение города маршрута — через CoreLocation + CLGeocoder (Apple, бесплатно, не считается в лимит Яндекса).  
500 req/day достаточно для TestFlight (10–50 тестировщиков).

---

## MVP Scope (TestFlight)

**В MVP:**
- Регистрация / вход (JWT)
- Запись GPS-маршрута
- Добавление точки → модалка (фото, заголовок, описание, место)
- Просмотр своих маршрутов на карте
- Подписки: follow/unfollow пользователей
- Карта: маршруты подписок (другим цветом)
- Создание и просмотр событий на карте

**После TestFlight:**
- Лайки / комментарии к маршрутам
- Push-уведомления
- Дискавери «рядом прямо сейчас» (главный экран-агрегатор)
- Android-приложение

---

## Deployment

- **Local dev:** Docker Compose (все сервисы + PostgreSQL + Redis)
- **TestFlight:** Ubuntu VPS + Docker Compose + Nginx
- **iOS:** Xcode → Archive → TestFlight

---

## Visibility Model

Маршруты и события имеют три уровня видимости:
- `public` — видят все пользователи
- `followers` — только подписчики
- `private` — только владелец
