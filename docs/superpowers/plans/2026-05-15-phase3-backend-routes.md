# Phase 3 Backend — route-service

**Date:** 2026-05-15  
**Scope:** route-service (GPS tracks, visibility, social feed)  
**Depends on:** Phase 1 (DB schema, Docker Compose), Phase 2 (user-service JWT, `/auth/validate`)

---

## Architecture decisions

- `route-service` runs on port **8082** (user-service owns 8081)
- No migrations in route-service — schema (`routes`, `waypoints`) already applied by user-service's `0001_initial.up.sql`
- JWT validation at **Nginx** level via `auth_request /auth/validate` → user-service
- route-service reads `X-User-ID` header set by Nginx; never re-validates the token itself
- `gps_track` stored as PostGIS `GEOMETRY(LineString, 4326)`, received/sent as GeoJSON
- `distance_m` calculated server-side: `ST_Length(geom::geography)::int`
- Visibility enforced **in SQL** for all list/get endpoints
- Feed: JOIN follows, only `public`/`followers` routes, paginated `?limit=20&offset=0`

---

## Files to create/modify

```
backend/
├── docker-compose.yml                         ← add route-service
├── nginx/nginx.conf                           ← auth_request + route_service upstream
├── user-service/
│   ├── internal/
│   │   ├── handler/validate.go               ← NEW: GET /auth/validate
│   │   └── service/auth.go                   ← ADD: ValidateToken method
│   └── main.go                               ← wire /auth/validate
└── route-service/                            ← NEW module
    ├── go.mod
    ├── Dockerfile
    ├── main.go
    └── internal/
        ├── handler/
        │   ├── health.go
        │   ├── respond.go
        │   └── route.go
        ├── middleware/
        │   └── auth.go
        ├── model/
        │   └── route.go
        ├── service/
        │   └── route.go
        └── store/
            └── route.go
```

---

## Task 1 — route-service Go module + chi router + health endpoint

**Commit:** `feat(route-service): Go module, chi router, health endpoint`

### `backend/route-service/go.mod`
```
module github.com/cooljekee/wayvy/route-service
go 1.22

require (
    github.com/go-chi/chi/v5 v5.1.0
    github.com/google/uuid v1.6.0
    github.com/jackc/pgx/v5 v5.6.0
)
```

### `backend/route-service/main.go`
```go
package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/jackc/pgx/v5/pgxpool"

    "github.com/cooljekee/wayvy/route-service/internal/handler"
    "github.com/cooljekee/wayvy/route-service/internal/middleware" // auth middleware
    "github.com/cooljekee/wayvy/route-service/internal/service"
    "github.com/cooljekee/wayvy/route-service/internal/store"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    slog.SetDefault(logger)

    dbURL := mustEnv("DATABASE_URL")

    pool, err := pgxpool.New(context.Background(), dbURL)
    // ping + defer pool.Close()

    routeStore := store.NewRouteStore(pool)
    routeSvc   := service.NewRouteService(routeStore)
    routeH     := handler.NewRouteHandler(routeSvc)

    r := chi.NewRouter()
    r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)

    r.Get("/health", handler.Health)

    r.Group(func(r chi.Router) {
        r.Use(authmw.UserIDMiddleware)  // all routes below require X-User-ID
        r.Get("/routes/feed",    routeH.GetFeed)
        r.Post("/routes",        routeH.CreateRoute)
        r.Get("/routes",         routeH.ListMyRoutes)
        r.Get("/routes/{id}",    routeH.GetRoute)
        r.Delete("/routes/{id}", routeH.DeleteRoute)
    })

    // graceful shutdown pattern (same as user-service)
}
```

### `backend/route-service/Dockerfile`
Multi-stage alpine, same pattern as user-service. Port 8082.

### `backend/docker-compose.yml` additions
```yaml
route-service:
  build: ./route-service
  environment:
    DATABASE_URL: postgres://${POSTGRES_USER:-wayvy}:${POSTGRES_PASSWORD:-wayvy}@postgres:5432/${POSTGRES_DB:-wayvy}?sslmode=disable
    PORT: "8082"
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://localhost:8082/health || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 10
    start_period: 10s
  depends_on:
    postgres:
      condition: service_healthy
```

nginx depends_on updated to include route-service `service_healthy`.

---

## Task 2 — JWT auth middleware + user-service /auth/validate

**Commit:** `feat(route-service): JWT auth middleware via X-User-ID`

### `user-service/internal/service/auth.go` — add method
```go
// ValidateToken parses and validates a JWT, returns the user UUID from sub claim.
func (s *AuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
    t, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return s.jwtSecret, nil
    })
    if err != nil || !t.Valid {
        return uuid.Nil, ErrInvalidCode // reuse or add ErrInvalidToken
    }
    claims, ok := t.Claims.(jwt.MapClaims)
    if !ok {
        return uuid.Nil, ErrInvalidToken
    }
    sub, _ := claims["sub"].(string)
    id, err := uuid.Parse(sub)
    if err != nil {
        return uuid.Nil, ErrInvalidToken
    }
    return id, nil
}
```

### `user-service/internal/handler/validate.go`
```go
// GET /auth/validate  — internal endpoint for Nginx auth_request
// Reads Authorization: Bearer <token>, validates JWT, sets X-User-ID response header.
// Returns 200 on valid token, 401 otherwise.
func (h *ValidateHandler) Validate(w http.ResponseWriter, r *http.Request) {
    auth := r.Header.Get("Authorization")
    if !strings.HasPrefix(auth, "Bearer ") {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }
    id, err := h.svc.ValidateToken(strings.TrimPrefix(auth, "Bearer "))
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }
    w.Header().Set("X-User-ID", id.String())
    w.WriteHeader(http.StatusOK)
}
```

### `route-service/internal/middleware/auth.go`
```go
type ctxKey struct{}

// UserIDMiddleware reads X-User-ID set by Nginx, injects into context.
// Returns 401 JSON if header is missing or invalid UUID.
func UserIDMiddleware(next http.Handler) http.Handler { ... }

// UserIDFromCtx extracts the user UUID from context (set by UserIDMiddleware).
func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) { ... }
```

---

## Task 3 — POST /routes

**Commit:** `feat(route-service): POST /routes — create route with PostGIS`

### Request body
```json
{
    "title": "Morning run",
    "gps_track": {"type": "LineString", "coordinates": [[37.6, 55.7], [37.61, 55.71]]},
    "city": "Moscow",
    "visibility": "public",
    "started_at": "2026-05-15T08:00:00Z",
    "finished_at": "2026-05-15T08:45:00Z",
    "duration_s": 2700
}
```

### SQL (store layer)
```sql
WITH g AS (
    SELECT ST_SetSRID(ST_GeomFromGeoJSON($4::text), 4326) AS geom
)
INSERT INTO routes (user_id, title, city, gps_track, distance_m, duration_s, visibility, started_at, finished_at)
SELECT $1, $2, $3, geom, ST_Length(geom::geography)::int, $5, $6::visibility_enum, $7, $8
FROM g
RETURNING id, user_id, title, city,
    ST_AsGeoJSON(gps_track)::json AS gps_track,
    distance_m, duration_s, visibility, started_at, finished_at, created_at
```

### Validation in handler
- `gps_track` must be non-null JSON object
- `visibility` must be one of `public`, `followers`, `private`
- `started_at` < `finished_at`
- Returns 201 Created with full route object

---

## Task 4 — GET /routes, GET /routes/{id}, DELETE /routes/{id}

**Commit:** `feat(route-service): GET/DELETE routes with visibility`

### GET /routes — my routes
```sql
SELECT id, user_id, title, city, ST_AsGeoJSON(gps_track)::json AS gps_track,
       distance_m, duration_s, visibility, started_at, finished_at, created_at
FROM routes
WHERE user_id = $1
ORDER BY created_at DESC
```

### GET /routes/{id} — visibility-enforced
```sql
SELECT ... FROM routes
WHERE id = $1
  AND (
      user_id = $2        -- owner always sees it
      OR visibility = 'public'
      OR (visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = user_id
      ))
  )
```
Returns 404 if no row (don't leak existence to unauthorized viewer).

### DELETE /routes/{id}
```sql
DELETE FROM routes WHERE id = $1 AND user_id = $2
```
Returns 204 No Content on success, 404 if not found or not owner.

---

## Task 5 — GET /routes/feed

**Commit:** `feat(route-service): GET /routes/feed — subscriptions feed`

### Query params: `?limit=20&offset=0` (limit max 100)

### SQL
```sql
SELECT r.id, r.user_id, r.title, r.city,
       ST_AsGeoJSON(r.gps_track)::json AS gps_track,
       r.distance_m, r.duration_s, r.visibility,
       r.started_at, r.finished_at, r.created_at
FROM routes r
JOIN follows f ON f.following_id = r.user_id
WHERE f.follower_id = $1
  AND r.visibility IN ('public', 'followers')
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3
```

### Response
```json
{ "items": [...], "total": 42 }
```

Total via COUNT(*) with same WHERE clause (no LIMIT/OFFSET).

---

## Task 6 — Nginx: auth_request + route_service upstream

**Commit:** `feat(nginx): add routes and waypoints proxy with JWT auth`

### nginx.conf changes
1. Add `upstream route_service { server route-service:8082; }`
2. Add internal location for JWT validation:
```nginx
location = /auth/validate {
    internal;
    proxy_pass             http://user_service/auth/validate;
    proxy_pass_request_body off;
    proxy_set_header       Content-Length  "";
    proxy_set_header       Authorization   $http_authorization;
    proxy_connect_timeout  3s;
    proxy_read_timeout     5s;
}
```
3. Replace `/routes/` stub with real proxy + auth_request:
```nginx
location /routes/ {
    auth_request      /auth/validate;
    auth_request_set  $x_user_id $upstream_http_x_user_id;
    proxy_set_header  X-User-ID $x_user_id;
    limit_req zone=api burst=20 nodelay;
    proxy_pass        http://route_service;
    # standard proxy headers
}
```
4. Same for `/waypoints/`

---

## Engineer checklist (from Go skill)

- [x] PostGIS indexes exist for every geo query column (in 0001_initial.up.sql)
- [x] Visibility filter applied in SQL for GET /routes/{id} and /routes/feed
- [x] Events CANNOT have visibility = 'private' — not relevant here (routes can)
- [x] `route_id` is nullable in waypoints — preserved from Phase 1 schema
- [x] JWT extracted from X-User-ID header (set by Nginx via auth_request)
- [x] No raw error strings returned to client — structured JSON only
- [x] Context propagated through handler → service → store
- [x] GeoJSON coordinates in lon,lat order
- [x] All timestamps TIMESTAMPTZ, returned as RFC 3339
- [x] `docker compose up` starts cleanly with no manual steps
