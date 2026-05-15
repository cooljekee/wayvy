package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Route struct {
	ID         uuid.UUID       `json:"id"`
	UserID     uuid.UUID       `json:"user_id"`
	Title      *string         `json:"title"`
	City       *string         `json:"city"`
	GpsTrack   json.RawMessage `json:"gps_track"`
	DistanceM  int             `json:"distance_m"`
	DurationS  int             `json:"duration_s"`
	Visibility string          `json:"visibility"`
	StartedAt  time.Time       `json:"started_at"`
	FinishedAt time.Time       `json:"finished_at"`
	CreatedAt  time.Time       `json:"created_at"`
}

type CreateRouteInput struct {
	UserID     uuid.UUID
	Title      *string
	City       *string
	GpsTrack   json.RawMessage // GeoJSON LineString
	DurationS  int
	Visibility string
	StartedAt  time.Time
	FinishedAt time.Time
}
