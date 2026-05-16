ALTER TABLE waypoints
    ADD COLUMN user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN visibility     visibility_enum NOT NULL DEFAULT 'public',
    ADD COLUMN cover_photo_url TEXT;
