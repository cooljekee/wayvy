CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 'private' is valid for routes only; events are blocked from it by CONSTRAINT events_no_private
CREATE TYPE visibility_enum AS ENUM ('public', 'followers', 'private');

-- users: phone-based auth (SMS OTP), no password stored
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
    route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,  -- nullable = standalone waypoint
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

-- events: no 'private' visibility — public or followers only
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

-- PostGIS spatial indexes (required for geo queries)
CREATE INDEX idx_waypoints_location ON waypoints USING GIST (location);
CREATE INDEX idx_events_location    ON events    USING GIST (location);
CREATE INDEX idx_events_starts_at   ON events    (starts_at);
CREATE INDEX idx_routes_user_id     ON routes    (user_id);
CREATE INDEX idx_waypoints_route_id ON waypoints (route_id);
