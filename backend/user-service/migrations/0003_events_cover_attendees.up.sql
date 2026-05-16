-- Add cover_url to events (was missing in 0001)
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Attendees join table
CREATE TABLE IF NOT EXISTS event_attendees (
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id  ON event_attendees (user_id);
