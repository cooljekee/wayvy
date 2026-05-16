package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cooljekee/wayvy/event-service/internal/model"
)

type EventStore struct {
	db *pgxpool.Pool
}

func NewEventStore(db *pgxpool.Pool) *EventStore {
	return &EventStore{db: db}
}

const createEventSQL = `
INSERT INTO events (user_id, title, description, cover_url, location, address, starts_at, ends_at, visibility)
VALUES ($1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7, $8, $9, $10::visibility_enum)
RETURNING id, user_id, title, description, cover_url,
    ST_AsGeoJSON(location)::json AS location,
    address, starts_at, ends_at, visibility::text,
    0 AS attend_count, false AS is_attending, created_at`

func (s *EventStore) Create(ctx context.Context, in model.CreateEventInput) (*model.Event, error) {
	row := s.db.QueryRow(ctx, createEventSQL,
		in.UserID, in.Title, in.Description, in.CoverURL,
		in.Lon, in.Lat,
		in.Address, in.StartsAt, in.EndsAt, in.Visibility,
	)
	e, err := scanEvent(row)
	if err != nil {
		return nil, fmt.Errorf("store.Create: %w", err)
	}
	return e, nil
}

const listEventsSQL = `
SELECT e.id, e.user_id, e.title, e.description, e.cover_url,
    ST_AsGeoJSON(e.location)::json AS location,
    e.address, e.starts_at, e.ends_at, e.visibility::text,
    COUNT(ea.user_id)            AS attend_count,
    BOOL_OR(ea.user_id = $1)     AS is_attending,
    e.created_at
FROM events e
LEFT JOIN event_attendees ea ON ea.event_id = e.id
WHERE e.starts_at > NOW()
  AND (
      e.visibility = 'public'
      OR e.user_id = $1
      OR (e.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = e.user_id
      ))
  )
GROUP BY e.id
ORDER BY e.starts_at ASC
LIMIT $2 OFFSET $3`

const listEventsCountSQL = `
SELECT COUNT(*)
FROM events e
WHERE e.starts_at > NOW()
  AND (
      e.visibility = 'public'
      OR e.user_id = $1
      OR (e.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = e.user_id
      ))
  )`

func (s *EventStore) List(ctx context.Context, viewerID uuid.UUID, limit, offset int) ([]*model.Event, int, error) {
	var total int
	if err := s.db.QueryRow(ctx, listEventsCountSQL, viewerID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("store.List count: %w", err)
	}

	rows, err := s.db.Query(ctx, listEventsSQL, viewerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("store.List query: %w", err)
	}
	defer rows.Close()

	var events []*model.Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("store.List scan: %w", err)
		}
		events = append(events, e)
	}
	return events, total, rows.Err()
}

const getEventByIDSQL = `
SELECT e.id, e.user_id, e.title, e.description, e.cover_url,
    ST_AsGeoJSON(e.location)::json AS location,
    e.address, e.starts_at, e.ends_at, e.visibility::text,
    COUNT(ea.user_id)            AS attend_count,
    BOOL_OR(ea.user_id = $1)     AS is_attending,
    e.created_at
FROM events e
LEFT JOIN event_attendees ea ON ea.event_id = e.id
WHERE e.id = $2
  AND (
      e.visibility = 'public'
      OR e.user_id = $1
      OR (e.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = e.user_id
      ))
  )
GROUP BY e.id`

func (s *EventStore) GetByID(ctx context.Context, eventID, viewerID uuid.UUID) (*model.Event, error) {
	e, err := scanEvent(s.db.QueryRow(ctx, getEventByIDSQL, viewerID, eventID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("store.GetByID: %w", err)
	}
	return e, nil
}

const deleteEventSQL = `DELETE FROM events WHERE id = $1 AND user_id = $2`

// Delete removes an event owned by userID. Returns (true, nil) if deleted, (false, nil) if not found/not owner.
func (s *EventStore) Delete(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	tag, err := s.db.Exec(ctx, deleteEventSQL, eventID, userID)
	if err != nil {
		return false, fmt.Errorf("store.Delete: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// scanner is satisfied by both pgx.Row and pgx.Rows.
type scanner interface {
	Scan(dest ...any) error
}

func scanEvent(s scanner) (*model.Event, error) {
	var e model.Event
	err := s.Scan(
		&e.ID, &e.UserID, &e.Title, &e.Description, &e.CoverURL,
		&e.Location,
		&e.Address, &e.StartsAt, &e.EndsAt, &e.Visibility,
		&e.AttendCount, &e.IsAttending,
		&e.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("store.scanEvent: %w", err)
	}
	return &e, nil
}

// scanEventNearby scans 14 columns: all from scanEvent + distance_m as the 14th.
func scanEventNearby(s scanner) (*model.Event, error) {
	var e model.Event
	err := s.Scan(
		&e.ID, &e.UserID, &e.Title, &e.Description, &e.CoverURL,
		&e.Location,
		&e.Address, &e.StartsAt, &e.EndsAt, &e.Visibility,
		&e.AttendCount, &e.IsAttending,
		&e.CreatedAt,
		&e.DistanceM,
	)
	if err != nil {
		return nil, fmt.Errorf("store.scanEventNearby: %w", err)
	}
	return &e, nil
}

const nearbyEventsSQL = `
SELECT e.id, e.user_id, e.title, e.description, e.cover_url,
    ST_AsGeoJSON(e.location)::json AS location,
    e.address, e.starts_at, e.ends_at, e.visibility::text,
    COUNT(ea.user_id)                    AS attend_count,
    BOOL_OR(ea.user_id = $4)             AS is_attending,
    e.created_at,
    ST_Distance(e.location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
FROM events e
LEFT JOIN event_attendees ea ON ea.event_id = e.id
WHERE e.starts_at >= $5
  AND ST_DWithin(
      e.location::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
  )
  AND (
      e.visibility = 'public'
      OR e.user_id = $4
      OR (e.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $4 AND following_id = e.user_id
      ))
  )
GROUP BY e.id
ORDER BY e.starts_at ASC
LIMIT 50`

// Nearby returns events within radiusM metres of (lon, lat) starting from `from`,
// visible to viewerID. ($1=lon, $2=lat, $3=radius_m, $4=viewerID, $5=from)
func (s *EventStore) Nearby(ctx context.Context, lon, lat float64, radiusM int, from time.Time, viewerID uuid.UUID) ([]*model.Event, error) {
	rows, err := s.db.Query(ctx, nearbyEventsSQL, lon, lat, radiusM, viewerID, from)
	if err != nil {
		return nil, fmt.Errorf("store.Nearby: %w", err)
	}
	defer rows.Close()

	var events []*model.Event
	for rows.Next() {
		e, err := scanEventNearby(rows)
		if err != nil {
			return nil, fmt.Errorf("store.Nearby scan: %w", err)
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

const attendSQL = `
INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING`

// Attend registers userID as attending eventID (idempotent — ON CONFLICT DO NOTHING).
func (s *EventStore) Attend(ctx context.Context, eventID, userID uuid.UUID) error {
	_, err := s.db.Exec(ctx, attendSQL, eventID, userID)
	if err != nil {
		return fmt.Errorf("store.Attend: %w", err)
	}
	return nil
}

const unattendSQL = `DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2`

// Unattend removes the attendance record. No error if the record does not exist.
func (s *EventStore) Unattend(ctx context.Context, eventID, userID uuid.UUID) error {
	_, err := s.db.Exec(ctx, unattendSQL, eventID, userID)
	if err != nil {
		return fmt.Errorf("store.Unattend: %w", err)
	}
	return nil
}

const listAttendeesSQL = `
SELECT u.id, u.username, u.avatar_url
FROM event_attendees ea
JOIN users u ON u.id = ea.user_id
WHERE ea.event_id = $1
ORDER BY ea.created_at ASC
LIMIT $2`

// ListAttendees returns up to limit users attending eventID.
func (s *EventStore) ListAttendees(ctx context.Context, eventID uuid.UUID, limit int) ([]*model.AttendeeUser, error) {
	rows, err := s.db.Query(ctx, listAttendeesSQL, eventID, limit)
	if err != nil {
		return nil, fmt.Errorf("store.ListAttendees: %w", err)
	}
	defer rows.Close()

	var attendees []*model.AttendeeUser
	for rows.Next() {
		var a model.AttendeeUser
		if err := rows.Scan(&a.ID, &a.Username, &a.AvatarURL); err != nil {
			return nil, fmt.Errorf("store.ListAttendees scan: %w", err)
		}
		attendees = append(attendees, &a)
	}
	return attendees, rows.Err()
}
