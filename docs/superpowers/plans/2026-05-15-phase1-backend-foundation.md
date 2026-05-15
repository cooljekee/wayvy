# Phase 1 Backend — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять Go backend infrastructure: Docker Compose с PostGIS и Redis, user-service с healthcheck, миграции с корректной схемой (phone вместо email), Nginx роутинг.

**Architecture:** Каждый микросервис — самостоятельный Go бинарник с chi router и pgx/v5. Все сервисы живут в `backend/`. Nginx проксирует по path prefix. Миграции хранятся в SQL файлах, применяются через `golang-migrate`.

**Tech Stack:** Go 1.22, chi v5, pgx/v5, postgis/postgis:16-3.4, redis:7-alpine, nginx:alpine, golang-migrate/migrate

---

### Task 1: Repo structure и docker-compose

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/Makefile`
- Create: `backend/.env.example`

- [ ] **Step 1: Создать docker-compose.yml**

```yaml
# backend/docker-compose.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: wayvy
      POSTGRES_USER: wayvy
      POSTGRES_PASSWORD: wayvy
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wayvy"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - user-service

  user-service:
    build: ./user-service
    environment:
      DATABASE_URL: postgres://wayvy:wayvy@postgres:5432/wayvy?sslmode=disable
      REDIS_ADDR: redis:6379
      PORT: "8081"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  pgdata:
```

- [ ] **Step 2: Создать Makefile**

```makefile
# backend/Makefile
.PHONY: up down logs migrate

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f $(svc)

migrate:
	docker compose exec user-service /app/migrate up

ps:
	docker compose ps
```

- [ ] **Step 3: Создать .env.example**

```
# backend/.env.example
DATABASE_URL=postgres://wayvy:wayvy@localhost:5432/wayvy?sslmode=disable
REDIS_ADDR=localhost:6379
JWT_SECRET=change_me_32_chars_minimum
SMSAERO_EMAIL=your@email.com
SMSAERO_API_KEY=your_prod_key
SMSAERO_API_KEY_TEST=your_test_key
PORT=8081
```

- [ ] **Step 4: Убедиться что структура верна**

```bash
ls backend/
# docker-compose.yml  Makefile  .env.example
```

- [ ] **Step 5: Commit**

```bash
git add backend/docker-compose.yml backend/Makefile backend/.env.example
git commit -m "feat(backend): add docker-compose, Makefile, env template"
```

---

### Task 2: Nginx конфиг

**Files:**
- Create: `backend/nginx/nginx.conf`

- [ ] **Step 1: Создать nginx.conf**

```nginx
# backend/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream user_service {
        server user-service:8081;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

    server {
        listen 80;

        location /health {
            return 200 'ok';
            add_header Content-Type text/plain;
        }

        # Auth endpoints — no JWT required
        location /auth/ {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://user_service;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # All other endpoints — JWT will be validated by service (phase 2+)
        location /users/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://user_service;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /routes/ {
            limit_req zone=api burst=20 nodelay;
            # proxy_pass http://route_service;  # uncomment in phase 3
            return 503 '{"error":"not yet implemented"}';
            add_header Content-Type application/json;
        }

        location /events/ {
            limit_req zone=api burst=20 nodelay;
            # proxy_pass http://event_service;  # uncomment in phase 6
            return 503 '{"error":"not yet implemented"}';
            add_header Content-Type application/json;
        }

        location /media/ {
            limit_req zone=api burst=5 nodelay;
            # proxy_pass http://media_service;  # uncomment in phase 4
            return 503 '{"error":"not yet implemented"}';
            add_header Content-Type application/json;
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/nginx/nginx.conf
git commit -m "feat(backend): add nginx routing config"
```

---

### Task 3: user-service Go module и структура

**Files:**
- Create: `backend/user-service/go.mod`
- Create: `backend/user-service/main.go`
- Create: `backend/user-service/internal/handler/health.go`
- Create: `backend/user-service/Dockerfile`

- [ ] **Step 1: Инициализировать Go модуль**

```bash
cd backend/user-service
go mod init github.com/cooljekee/wayvy/user-service
go get github.com/go-chi/chi/v5@latest
go get github.com/jackc/pgx/v5@latest
go get github.com/redis/go-redis/v9@latest
go get github.com/golang-jwt/jwt/v5@latest
```

- [ ] **Step 2: Создать main.go**

```go
// backend/user-service/main.go
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
	"github.com/cooljekee/wayvy/user-service/internal/handler"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", handler.Health)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("user-service starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	slog.Info("user-service stopped")
}
```

- [ ] **Step 3: Создать health handler**

```go
// backend/user-service/internal/handler/health.go
package handler

import (
	"encoding/json"
	"net/http"
)

func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

- [ ] **Step 4: Написать тест для healthcheck**

```go
// backend/user-service/internal/handler/health_test.go
package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cooljekee/wayvy/user-service/internal/handler"
)

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handler.Health(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}

	if body["status"] != "ok" {
		t.Fatalf("expected status=ok, got %q", body["status"])
	}
}
```

- [ ] **Step 5: Запустить тест**

```bash
cd backend/user-service
go test ./internal/handler/... -v
# Expected: PASS TestHealth
```

- [ ] **Step 6: Создать Dockerfile**

```dockerfile
# backend/user-service/Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./main.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8081
CMD ["./server"]
```

- [ ] **Step 7: Commit**

```bash
git add backend/user-service/
git commit -m "feat(user-service): Go module, chi router, health endpoint + test"
```

---

### Task 4: PostgreSQL миграции

**Files:**
- Create: `backend/user-service/migrations/0001_initial.sql`
- Create: `backend/user-service/internal/db/migrate.go`

- [ ] **Step 1: Создать миграцию 0001**

```sql
-- backend/user-service/migrations/0001_initial.sql
-- +migrate Up

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE visibility_enum AS ENUM ('public', 'followers', 'private');

-- users: phone-based auth (SMS OTP), no password
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone      TEXT UNIQUE NOT NULL CHECK (phone ~ '^\+[1-9]\d{6,14}$'),
    username   TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

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

CREATE TABLE waypoints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,
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

CREATE TABLE photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waypoint_id UUID NOT NULL REFERENCES waypoints(id) ON DELETE CASCADE,
    r2_key      TEXT NOT NULL,
    url         TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    CONSTRAINT events_no_private CHECK (visibility IN ('public', 'followers'))
);

-- PostGIS spatial indexes
CREATE INDEX idx_waypoints_location ON waypoints USING GIST (location);
CREATE INDEX idx_events_location    ON events    USING GIST (location);
CREATE INDEX idx_events_starts_at   ON events    (starts_at);
CREATE INDEX idx_routes_user_id     ON routes    (user_id);
CREATE INDEX idx_waypoints_route_id ON waypoints (route_id);

-- OTP storage will be in Redis, not postgres

-- +migrate Down
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS waypoints CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS visibility_enum;
```

- [ ] **Step 2: Добавить golang-migrate в go.mod**

```bash
cd backend/user-service
go get github.com/golang-migrate/migrate/v4@latest
go get github.com/golang-migrate/migrate/v4/database/postgres@latest
go get github.com/golang-migrate/migrate/v4/source/file@latest
```

- [ ] **Step 3: Создать db/migrate.go**

```go
// backend/user-service/internal/db/migrate.go
package db

import (
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL string) error {
	m, err := migrate.New("file://migrations", databaseURL)
	if err != nil {
		return fmt.Errorf("migrate.New: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate.Up: %w", err)
	}
	return nil
}
```

- [ ] **Step 4: Вызвать RunMigrations в main.go** (добавить после инициализации, до роутера)

```go
// в main.go после импортов добавить:
import "github.com/cooljekee/wayvy/user-service/internal/db"

// в функции main() перед r := chi.NewRouter():
dbURL := os.Getenv("DATABASE_URL")
if dbURL != "" {
    if err := db.RunMigrations(dbURL); err != nil {
        slog.Error("migrations failed", "err", err)
        os.Exit(1)
    }
    slog.Info("migrations applied")
}
```

- [ ] **Step 5: Проверить что миграция работает локально**

```bash
# Запустить postgres локально
docker compose up -d postgres
# Дождаться healthcheck
sleep 5
# Запустить миграции
DATABASE_URL="postgres://wayvy:wayvy@localhost:5432/wayvy?sslmode=disable" \
  go run ./main.go &
sleep 2
# Проверить таблицы
docker compose exec postgres psql -U wayvy -d wayvy -c "\dt"
# Expected: users, follows, routes, waypoints, photos, events + spatial_ref_sys
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add backend/user-service/migrations/ backend/user-service/internal/db/
git add backend/user-service/main.go backend/user-service/go.mod backend/user-service/go.sum
git commit -m "feat(user-service): PostGIS migrations, phone-based users schema"
```

---

### Task 5: Smoke test — полный stack

- [ ] **Step 1: Собрать и поднять всё**

```bash
cd backend
make up
# Ждём 15 секунд пока поднимется postgres
sleep 15
make ps
# Expected: все сервисы running
```

- [ ] **Step 2: Проверить healthcheck через Nginx**

```bash
curl -s http://localhost:8080/health
# Expected: ok

curl -s http://localhost:8080/auth/test
# Expected: 404 (nginx дошёл до user-service, но маршрут не существует)
```

- [ ] **Step 3: Проверить что миграции применились**

```bash
docker compose exec postgres psql -U wayvy -d wayvy -c "\dt"
# Expected: users, follows, routes, waypoints, photos, events

docker compose exec postgres psql -U wayvy -d wayvy -c "SELECT PostGIS_Version();"
# Expected: версия PostGIS
```

- [ ] **Step 4: Commit финальный**

```bash
git add .
git commit -m "feat(backend): phase 1 complete — stack boots, migrations apply, healthcheck ok"
```
