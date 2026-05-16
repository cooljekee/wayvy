ALTER TABLE waypoints
    DROP COLUMN IF EXISTS cover_photo_url,
    DROP COLUMN IF EXISTS visibility,
    DROP COLUMN IF EXISTS user_id;
