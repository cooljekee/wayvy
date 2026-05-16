# Phase 5 Track B — Social Graph + Feed
**Date:** 2026-05-16  
**Service:** user-service (Tasks 1–4) · route-service (Task 5) · nginx (Task 6)

---

## Context

Phase 4 is complete: waypoints CRUD + photos in route-service, media-service upload → R2.  
Phase 5 adds the social layer: follow graph with Redis cache, user search, public profiles, and bbox map query for friends' waypoints.

---

## Architecture decisions

### Redis cache for follow lists
- Keys: `followers:{userID}` and `following:{userID}`
- Value: JSON-encoded `[]PublicUser` (full list, no pagination in cache)
- TTL: 5 minutes
- Invalidation: DEL both keys on any follow/unfollow for the affected pair
- Pagination served from in-memory slice of the cached list → clean, simple for MVP

### UserIDMiddleware in user-service
- Same pattern as route-service (reads `X-User-ID` header set by Nginx)
- New `internal/middleware/auth.go` in user-service

### Profile query
- Single SQL: user row + 4 correlated subqueries (city from last route, route/follower/following counts, is_following bool)
- routes_count counts `visibility IN ('public', 'followers')` — publicly visible routes only

### Waypoints/map in route-service
- JOINs `follows` table (shared DB) → no cross-service call needed
- `ST_Within(location, ST_MakeEnvelope(lon_min, lat_min, lon_max, lat_max, 4326))`
- Filters: visibility IN ('public', 'followers') AND user_id in current viewer's follows
- LIMIT 100 for pre-MVP

### Nginx /users/ split
- `location /users/search { ... }` — no JWT (public endpoint, longer prefix wins)
- `location /users/ { auth_request ... }` — JWT required for everything else

---

## New files

| File | Purpose |
|---|---|
| `user-service/internal/middleware/auth.go` | UserIDMiddleware (reads X-User-ID) |
| `user-service/internal/model/user.go` | PublicUser, Profile, FollowPage types |
| `user-service/internal/store/follow.go` | FollowStore: Follow, Unfollow, ListFollowers, ListFollowing |
| `user-service/internal/service/social.go` | SocialService: follow/unfollow + Redis-cached followers/following |
| `user-service/internal/service/user_svc.go` | UserService: search + profile |
| `user-service/internal/handler/user.go` | UserHandler: all 6 endpoints |

## Modified files

| File | Change |
|---|---|
| `user-service/internal/store/user.go` | Add SearchUsers, GetByID, GetProfile |
| `user-service/main.go` | Wire middleware + new handlers + routes |
| `route-service/internal/store/waypoint.go` | Add ListInBboxForFollows |
| `route-service/internal/handler/waypoint.go` | Add MapQuery handler |
| `route-service/main.go` | Register GET /waypoints/map |
| `nginx/nginx.conf` | Split /users/ location, enforce JWT |

---

## Commits (in order)

1. `feat(user-service): follow/unfollow + followers/following endpoints`
2. `feat(user-service): Redis cache for follow graph`
3. `feat(user-service): user search endpoint`
4. `feat(user-service): public profile endpoint with counters`
5. `feat(route-service): GET /waypoints/map — bbox query for subscriptions map`
6. `feat(nginx): /users/ proxy with JWT enforcement`

---

## Key SQL

### Follow store

```sql
-- Follow
INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING

-- Unfollow
DELETE FROM follows WHERE follower_id = $1 AND following_id = $2

-- ListFollowers (all, full list for Redis caching)
SELECT u.id, u.username, u.avatar_url
FROM follows f JOIN users u ON u.id = f.follower_id
WHERE f.following_id = $1
ORDER BY f.created_at DESC

-- ListFollowing (all)
SELECT u.id, u.username, u.avatar_url
FROM follows f JOIN users u ON u.id = f.following_id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC
```

### User search

```sql
SELECT id, username, avatar_url
FROM users
WHERE username IS NOT NULL AND username ILIKE $1
LIMIT 20
-- $1 = '%' + q + '%'
```

### Public profile (single query)

```sql
SELECT
    u.id, u.username, u.avatar_url,
    (SELECT r.city FROM routes r WHERE r.user_id = u.id AND r.city IS NOT NULL
     ORDER BY r.created_at DESC LIMIT 1) AS city,
    (SELECT COUNT(*)::int FROM routes r2 WHERE r2.user_id = u.id
     AND r2.visibility IN ('public','followers')) AS routes_count,
    (SELECT COUNT(*)::int FROM follows f1 WHERE f1.following_id = u.id) AS followers_count,
    (SELECT COUNT(*)::int FROM follows f2 WHERE f2.follower_id = u.id) AS following_count,
    EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = $2 AND f3.following_id = u.id) AS is_following
FROM users u
WHERE u.id = $1
```

### Waypoints/map bbox

```sql
SELECT <waypointCols>
FROM waypoints w
WHERE w.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
  AND ST_Within(w.location, ST_MakeEnvelope($2, $3, $4, $5, 4326))
  AND w.visibility IN ('public', 'followers')
  AND w.user_id IS NOT NULL
ORDER BY w.created_at DESC
LIMIT 100
-- $1=viewerID, $2=lonMin, $3=latMin, $4=lonMax, $5=latMax
```

---

## Self-review checklist (run before each commit)

- [ ] Cannot follow yourself → 400
- [ ] Redis keys invalidated on follow/unfollow
- [ ] Profile query returns 404 for unknown user
- [ ] Waypoints/map: visibility IN ('public','followers') only — no private
- [ ] /users/search: no JWT required, nginx longest-prefix rule
- [ ] All other /users/: JWT required via auth_request
- [ ] GeoJSON lon,lat order in bbox parsing
- [ ] Context propagated through all layers
