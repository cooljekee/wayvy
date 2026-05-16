# Phase 4 Track B — Waypoints + Media Service

**Date:** 2026-05-16  
**Status:** In progress

---

## Context

Phase 3 complete: route-service with full CRUD on routes, PostGIS LineString, feed, JWT via X-User-ID header.  
Schema already has `waypoints` and `photos` tables (from migration 0001), but they lack `user_id`, `visibility`, and `cover_photo_url` — added in migration 0002.

---

## Architecture decisions

### Migration 0002 (user-service)
`waypoints` is missing three columns needed for auth and display:
- `user_id UUID REFERENCES users(id)` — nullable (pre-existing rows safe), always set by API
- `visibility visibility_enum NOT NULL DEFAULT 'public'` — same 3-value enum as routes
- `cover_photo_url TEXT` — denormalized first-photo URL; updated on first photo attach

Migration runs in user-service on startup (embedded FS, golang-migrate).

### Waypoint duality (first-class design constraint)
- `route_id` nullable → standalone waypoint (no parent route)
- `route_id` set → route-linked waypoint
These surface differently on the iOS map and open different sheets on tap. Must never conflate them.

### Visibility enforcement for waypoints
- Applied in SQL, never in app code
- `GET /waypoints/{id}`: OR-clause: user_id=$viewer OR public OR (followers AND follows exists)
- `GET /routes/{id}/waypoints`: join routes; use route's visibility to gate entire list
- `GET /waypoints/nearby`: same OR-clause as GET by ID; filter `user_id IS NOT NULL` to skip pre-migration orphans

### cover_photo_url update strategy
On `POST /waypoints/{id}/photos`: insert photo, then `UPDATE waypoints SET cover_photo_url=$url WHERE id=$id AND cover_photo_url IS NULL`.  
Race-safe: both writes are idempotent, no transaction needed. First caller wins.

### media-service
- Port: **8084** (user-service=8081, route-service=8082, reserved event-service=8083, media=8084)
- No JWT in nginx for `/media/` — user explicitly requested public upload endpoint
- No DB, no Redis — stateless: receive → resize → R2 → return key+url
- Resize: `github.com/disintegration/imaging`, Fit to 1080×1080, JPEG q80
- R2: aws-sdk-go-v2/service/s3 with BaseEndpoint override (path-style)
- Dockerfile: `go mod tidy && go build` pattern (no pre-cached go.sum)

### media-service ENV
```
R2_ENDPOINT         Cloudflare R2 S3 endpoint (https://<account>.r2.cloudflarestorage.com)
R2_BUCKET           bucket name
R2_ACCESS_KEY_ID    R2 API token
R2_SECRET_ACCESS_KEY R2 API secret
R2_PUBLIC_URL       public base URL (https://media.wayvy.app or bucket URL, no trailing slash)
PORT                8084
```

---

## File map

### New files
| File | Purpose |
|---|---|
| `user-service/migrations/0002_waypoints_user_visibility.up.sql` | Add user_id, visibility, cover_photo_url to waypoints |
| `user-service/migrations/0002_waypoints_user_visibility.down.sql` | Rollback |
| `route-service/internal/model/waypoint.go` | Waypoint, Photo, input types |
| `route-service/internal/store/waypoint.go` | DB queries (create, get, list, nearby, photos) |
| `route-service/internal/service/waypoint.go` | Business logic + ErrNotFound reuse |
| `route-service/internal/handler/waypoint.go` | HTTP handlers |
| `media-service/go.mod` | Module: github.com/cooljekee/wayvy/media-service |
| `media-service/main.go` | chi router, /health, /media/upload wired |
| `media-service/internal/handler/health.go` | GET /health |
| `media-service/internal/handler/respond.go` | respondJSON / respondError |
| `media-service/internal/handler/media.go` | POST /media/upload |
| `media-service/internal/service/media.go` | resize + R2 upload logic |
| `media-service/Dockerfile` | multi-stage alpine |

### Modified files
| File | Change |
|---|---|
| `route-service/main.go` | Wire WaypointHandler, add 6 new routes |
| `docker-compose.yml` | Add media-service service, update nginx depends_on |
| `nginx/nginx.conf` | Replace /media/ 503 stub with proxy to media-service:8084 |
| `.env.example` | Add R2_* vars |

---

## API contracts

### POST /waypoints
```
Body:  { "lat": float, "lon": float, "title": string, "description": string, "visibility": string, "route_id": uuid|null }
201:   Waypoint object
422:   VALIDATION_ERROR (bad visibility, missing lat/lon)
```

### GET /waypoints/{id}
```
200: Waypoint object (visibility enforced in SQL)
404: NOT_FOUND (not found or not authorized — don't leak existence)
```

### GET /routes/{id}/waypoints
```
200: { "items": [Waypoint] }
404: NOT_FOUND (route not visible to viewer)
```

### GET /waypoints/nearby?lat=&lon=&radius_m=
```
Query: lat (required), lon (required), radius_m (default 1000, max 10000)
200: { "items": [Waypoint] }
422: VALIDATION_ERROR (bad lat/lon)
```

### POST /waypoints/{id}/photos
```
Body:  { "r2_key": string, "url": string }
201:   Photo object
404:   NOT_FOUND (waypoint not found or not owner)
```

### GET /waypoints/{id}/photos
```
200: { "items": [Photo] }
404: NOT_FOUND
```

### POST /media/upload
```
Body:  multipart/form-data, field "file" (image/*)
Limit: 10 MB
201:   { "r2_key": "photos/uuid.jpg", "url": "https://..." }
400:   BAD_REQUEST (not multipart or file missing)
422:   VALIDATION_ERROR (not an image, too large)
500:   INTERNAL_ERROR (R2 upload failed)
```

---

## SQL queries (key patterns)

### Create waypoint ($5=lon, $6=lat — GeoJSON lon,lat order)
```sql
INSERT INTO waypoints (user_id, route_id, title, description, location, visibility)
VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7::visibility_enum)
RETURNING id, user_id, route_id, title, description,
    ST_AsGeoJSON(location)::json AS location,
    address, place_name, place_yandex_id, place_category,
    order_index, visibility::text, cover_photo_url, created_at
```

### Get waypoint with visibility enforcement
```sql
SELECT ... FROM waypoints
WHERE id = $1
  AND (user_id = $2 OR visibility = 'public'
       OR (visibility = 'followers' AND EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = user_id)))
```

### List waypoints by route (route visibility gates list)
```sql
SELECT w.* FROM waypoints w
JOIN routes r ON r.id = w.route_id
WHERE w.route_id = $1
  AND (r.user_id = $2 OR r.visibility = 'public'
       OR (r.visibility = 'followers' AND EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = r.user_id)))
ORDER BY w.order_index ASC NULLS LAST, w.created_at ASC
```

### Nearby (ST_DWithin, visibility enforced)
```sql
SELECT ... FROM waypoints
WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
  AND user_id IS NOT NULL
  AND (visibility = 'public' OR user_id = $4
       OR (visibility = 'followers' AND EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $4 AND following_id = user_id)))
ORDER BY location::geography <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
LIMIT 50
```

### Add photo + update cover
```sql
INSERT INTO photos (waypoint_id, r2_key, url, order_index)
VALUES ($1, $2, $3, (SELECT COALESCE(MAX(order_index)+1, 0) FROM photos WHERE waypoint_id=$1))
RETURNING id, waypoint_id, r2_key, url, order_index, created_at
-- then:
UPDATE waypoints SET cover_photo_url = $2 WHERE id = $1 AND cover_photo_url IS NULL
```

---

## Engineer checklist (run before marking done)

- [ ] Migration 0002 added to user-service/migrations/ — runs on startup
- [ ] `user_id` always set from MustUserIDFromCtx — never uuid.Nil in insert
- [ ] `route_id` nullable — standalone waypoint POST with no route_id works
- [ ] Visibility enforced in SQL for all 3 list/get endpoints (never in app code)
- [ ] `GET /waypoints/nearby` registered before `GET /waypoints/{id}` in chi router (static before param)
- [ ] `GET /routes/feed` still registered before `GET /routes/{id}` (unchanged)
- [ ] GeoJSON coordinates in lon,lat order (ST_MakePoint(lon, lat))
- [ ] cover_photo_url updated on first photo attach (WHERE cover_photo_url IS NULL)
- [ ] media-service port is 8084 (not 8082)
- [ ] R2 vars in .env.example (no real keys committed)
- [ ] No raw error strings returned to clients
