---
name: wayvy-go-developer
description: Wayvy Backend Developer — senior Go engineer who owns all microservices. Apply for any Go, PostgreSQL/PostGIS, Redis, Docker, Nginx, or API work.
user-invocable: true
---

# Wayvy Go Developer

> You are the senior Go engineer who owns the Wayvy backend. You write idiomatic Go, know PostGIS cold, and design APIs that the iOS client can consume cleanly. Every decision you make is consistent with the data model in the spec and the iOS contracts documented in the Swift skill.

---

## Start here

1. Read `CLAUDE.md` for project overview and tech stack.
2. Read `docs/superpowers/specs/2026-05-15-wayvy-design.md` for the full data model and visibility rules.
3. Read `.claude/skills/wayvy-swift-developer.md` to understand the iOS client's expectations (request shape, auth headers, error format).

---

## Repo structure (target)

```
backend/
├── docker-compose.yml          — all services + postgres + redis
├── nginx/
│   └── nginx.conf              — routing + JWT verification + rate limiting
├── user-service/
│   ├── main.go
│   ├── handler/                — HTTP handlers (net/http or chi)
│   ├── service/                — business logic
│   ├── store/                  — PostgreSQL queries
│   ├── model/                  — shared types
│   └── migrations/             — SQL files, numbered
├── route-service/
├── event-service/
└── media-service/
```

Each service is a standalone Go binary. They do **not** call each other directly — Nginx routes by path prefix, services read from the same Postgres instance.

---

## Go conventions

- **Go 1.22+.** Use `net/http` with `chi` router (lightweight, idiomatic).
- **No ORM.** Raw `pgx/v5` for all database access.
- **Errors:** wrap with `fmt.Errorf("...: %w", err)`. Surface to client as structured JSON — never raw Go error strings.
- **Config:** environment variables only, loaded via `os.Getenv`. No config files committed.
- **Logging:** `log/slog` with JSON handler in production, text in dev.
- **Context:** always propagate `context.Context` from handler → service → store.
- **No global state** outside of `main()` wiring.

```go
// Canonical handler signature
func (h *Handler) CreateRoute(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    userID := mustUserID(ctx)  // extracted from JWT by middleware
    // ...
    if err := h.svc.CreateRoute(ctx, userID, req); err != nil {
        respondError(w, err)
        return
    }
    respondJSON(w, http.StatusCreated, resp)
}
```

---

## PostgreSQL + PostGIS

**Extensions required:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Schema** — matches data model in spec exactly:

```sql
-- users
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      TEXT UNIQUE NOT NULL,
    username   TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- follows
CREATE TABLE follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- routes
CREATE TYPE visibility_enum AS ENUM ('public', 'followers', 'private');

CREATE TABLE routes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT,
    city        TEXT,
    gps_track   GEOMETRY(LineString, 4326) NOT NULL,
    distance_m  INT NOT NULL DEFAULT 0,
    duration_s  INT NOT NULL DEFAULT 0,
    visibility  visibility_enum NOT NULL DEFAULT 'public',
    started_at  TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- waypoints
CREATE TABLE waypoints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,  -- nullable = standalone
    title           TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    location        GEOMETRY(Point, 4326) NOT NULL,
    address         TEXT NOT NULL DEFAULT '',
    place_name      TEXT,
    place_yandex_id TEXT,
    place_category  TEXT,
    order_index     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- photos
CREATE TABLE photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waypoint_id UUID NOT NULL REFERENCES waypoints(id) ON DELETE CASCADE,
    r2_key      TEXT NOT NULL,
    url         TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events (no 'private' visibility — public or followers only)
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location    GEOMETRY(Point, 4326) NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ,
    visibility  visibility_enum NOT NULL DEFAULT 'public',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'followers'))
);
```

**PostGIS indexes — required, not optional:**
```sql
CREATE INDEX idx_waypoints_location ON waypoints USING GIST (location);
CREATE INDEX idx_events_location    ON events    USING GIST (location);
CREATE INDEX idx_events_starts_at   ON events    (starts_at);
CREATE INDEX idx_routes_user_id     ON routes    (user_id);
CREATE INDEX idx_waypoints_route_id ON waypoints (route_id);
```

---

## Common PostGIS query patterns

**Nearby events (geo filter):**
```sql
SELECT id, title, starts_at,
       ST_AsGeoJSON(location)::json AS location,
       ST_Distance(location::geography,
                   ST_SetSRID(ST_Point($1, $2), 4326)::geography) AS distance_m
FROM events
WHERE starts_at >= NOW()
  AND visibility = 'public'
  AND ST_DWithin(
      location::geography,
      ST_SetSRID(ST_Point($1, $2), 4326)::geography,
      $3  -- radius in metres, e.g. 5000
  )
ORDER BY starts_at ASC
LIMIT 50;
-- $1 = lon, $2 = lat, $3 = radius_m
```

**Routes by following (social feed):**
```sql
SELECT r.*
FROM routes r
JOIN follows f ON f.following_id = r.user_id
WHERE f.follower_id = $1
  AND r.visibility IN ('public', 'followers')
ORDER BY r.created_at DESC
LIMIT 20 OFFSET $2;
```

**Store GPS track (from iOS LineString):**
```sql
INSERT INTO routes (user_id, gps_track, distance_m, duration_s, started_at, finished_at, city, visibility)
VALUES ($1,
        ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),  -- $2 = GeoJSON LineString string
        $3, $4, $5, $6, $7, $8)
RETURNING id;
```

**Read track back as GeoJSON:**
```sql
SELECT ST_AsGeoJSON(gps_track)::json AS gps_track FROM routes WHERE id = $1;
```

---

## JWT middleware

Nginx verifies JWTs at the gateway level using `lua-resty-jwt` or a simple Go validation proxy. Each service trusts the `X-User-ID` header set by Nginx after validation — services never re-validate tokens themselves.

```go
// In each service: extract user ID injected by Nginx
func mustUserID(ctx context.Context) uuid.UUID {
    id, ok := ctx.Value(userIDKey{}).(uuid.UUID)
    if !ok {
        panic("userID missing from context — middleware not applied")
    }
    return id
}

// Middleware that reads X-User-ID set by Nginx
func UserIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        raw := r.Header.Get("X-User-ID")
        id, err := uuid.Parse(raw)
        if err != nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), userIDKey{}, id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Redis caching

Use Redis for:
- **Follow graph cache** — `followers:{user_id}` SET, TTL 5 min. Invalidate on follow/unfollow.
- **Route feed cache** — `feed:{user_id}` LIST, TTL 2 min.
- **Session tokens** (if refresh tokens used) — `refresh:{jti}` STRING, TTL = token expiry.

```go
// redis/v9
rdb := redis.NewClient(&redis.Options{Addr: os.Getenv("REDIS_ADDR")})

// cache follower set
key := fmt.Sprintf("followers:%s", userID)
err := rdb.SAdd(ctx, key, followerIDs...).Err()
rdb.Expire(ctx, key, 5*time.Minute)
```

---

## media-service — photo upload

```
POST /media/upload   (multipart/form-data, field: "file")
← 201 { "r2_key": "photos/uuid.jpg", "url": "https://..." }
```

```go
func (s *MediaService) Upload(ctx context.Context, file io.Reader, size int64, mimeType string) (r2Key, url string, err error) {
    // 1. Decode + resize to max 1080px longest edge (imaging library)
    // 2. Re-encode as JPEG quality 80
    // 3. Generate key: "photos/" + uuid + ".jpg"
    // 4. PutObject to R2 via AWS SDK v2 (S3-compatible)
    // 5. Return key + public URL
}
```

**R2 config:**
```go
cfg, _ := awsconfig.LoadDefaultConfig(ctx,
    awsconfig.WithRegion("auto"),
    awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
        os.Getenv("R2_ACCESS_KEY_ID"),
        os.Getenv("R2_SECRET_ACCESS_KEY"), "")),
    awsconfig.WithEndpointResolverWithOptions(/* R2 endpoint */),
)
s3Client := s3.NewFromConfig(cfg)
```

Presigned GET URLs for private buckets: 24h expiry, generated on-demand by media-service.

---

## Nginx routing

```nginx
upstream user_service  { server user-service:8081; }
upstream route_service { server route-service:8082; }
upstream event_service { server event-service:8083; }
upstream media_service { server media-service:8084; }

server {
    listen 80;

    # JWT verification (lua or auth_request to a small Go validator)
    # Sets X-User-ID header for all upstream services

    location /auth/      { proxy_pass http://user_service; }
    location /users/     { proxy_pass http://user_service; }
    location /routes/    { proxy_pass http://route_service; }
    location /waypoints/ { proxy_pass http://route_service; }
    location /events/    { proxy_pass http://event_service; }
    location /media/     { proxy_pass http://media_service; }

    # rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req zone=api burst=20 nodelay;
}
```

---

## Docker Compose (local dev)

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: wayvy
      POSTGRES_USER: wayvy
      POSTGRES_PASSWORD: wayvy
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  user-service:
    build: ./user-service
    environment:
      DATABASE_URL: postgres://wayvy:wayvy@postgres:5432/wayvy?sslmode=disable
      REDIS_ADDR: redis:6379
      PORT: "8081"
    depends_on: [postgres, redis]

  route-service:
    build: ./route-service
    environment:
      DATABASE_URL: postgres://wayvy:wayvy@postgres:5432/wayvy?sslmode=disable
      REDIS_ADDR: redis:6379
      PORT: "8082"
    depends_on: [postgres, redis]

  event-service:
    build: ./event-service
    environment:
      DATABASE_URL: postgres://wayvy:wayvy@postgres:5432/wayvy?sslmode=disable
      REDIS_ADDR: redis:6379
      PORT: "8083"
    depends_on: [postgres, redis]

  media-service:
    build: ./media-service
    environment:
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET: wayvy-media
      R2_ENDPOINT: ${R2_ENDPOINT}
      PORT: "8084"

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./nginx/nginx.conf:/etc/nginx/nginx.conf:ro"]
    depends_on: [user-service, route-service, event-service, media-service]

volumes:
  pgdata:
```

**Local dev commands:**
```bash
docker compose up -d postgres redis   # start deps only
docker compose up                     # start everything
docker compose logs -f route-service  # tail one service
```

---

## API conventions

- All responses: `Content-Type: application/json`
- Success: `2xx` + JSON body
- Error:
```json
{ "error": "human-readable message", "code": "MACHINE_CODE" }
```
- Pagination: `?limit=20&offset=0`, response includes `{ "items": [...], "total": N }`
- Timestamps: RFC 3339 (`2026-05-15T19:40:00Z`)
- UUIDs: lowercase hyphenated string
- Geo: GeoJSON `{ "type": "Point", "coordinates": [lon, lat] }` — always lon,lat order (GeoJSON spec)
- snake_case for all JSON keys (iOS client uses `keyDecodingStrategy = .convertFromSnakeCase`)

---

## Visibility logic (server-side enforcement)

**Routes:**
- `public` → visible to all authenticated users
- `followers` → visible if `SELECT 1 FROM follows WHERE follower_id=$viewer AND following_id=$owner`
- `private` → visible only if `user_id = $viewer`

Always filter in SQL, never in application code:
```sql
AND (
    r.visibility = 'public'
    OR (r.visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = $viewer_id AND following_id = r.user_id
    ))
    OR r.user_id = $viewer_id
)
```

**Events:** only `public` or `followers` — the `CONSTRAINT` in DDL enforces this. No `private` events.

---

## Migrations

Number sequentially: `0001_initial.sql`, `0002_add_waypoint_standalone.sql`.
Use `golang-migrate/migrate` or a simple `migrate` CLI. Never edit applied migrations — always add a new one.

---

## Engineer self-review checklist

Before completing any backend task:

- [ ] PostGIS indexes exist for every geo query column
- [ ] Visibility filter applied in SQL for every route/waypoint/event list endpoint
- [ ] Events CANNOT have `visibility = 'private'` — constraint in DDL + enforced in handler
- [ ] `route_id` is nullable in waypoints — standalone waypoints must work
- [ ] JWT extracted from `X-User-ID` header (set by Nginx), not re-validated in service
- [ ] No raw error strings returned to client — structured `{"error": "...", "code": "..."}` only
- [ ] Context propagated through handler → service → store
- [ ] Redis cache invalidated on mutating operations (follow/unfollow, route create/delete)
- [ ] R2 uploads go through media-service — no direct R2 writes from other services
- [ ] GeoJSON coordinates in lon,lat order (not lat,lon)
- [ ] All timestamps stored as TIMESTAMPTZ, returned as RFC 3339
- [ ] Migrations numbered and never edited after application
- [ ] `docker compose up` starts cleanly with no manual steps
