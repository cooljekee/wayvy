package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// GeoJSONPoint — { "type": "Point", "coordinates": [lon, lat] }
type GeoJSONPoint struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"` // [lon, lat]
}

type Event struct {
	ID          uuid.UUID       `json:"id"`
	UserID      uuid.UUID       `json:"user_id"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	CoverURL    *string         `json:"cover_url"`
	Location    json.RawMessage `json:"location"`    // GeoJSON Point
	Address     string          `json:"address"`
	StartsAt    time.Time       `json:"starts_at"`
	EndsAt      *time.Time      `json:"ends_at"`
	Visibility  string          `json:"visibility"`
	AttendCount int             `json:"attend_count"`
	IsAttending bool            `json:"is_attending"`
	CreatedAt   time.Time       `json:"created_at"`
	// DistanceM присутствует только в ответе nearby
	DistanceM *float64 `json:"distance_m,omitempty"`
}

// AttendeeUser — участник события в списке attendees
type AttendeeUser struct {
	ID        uuid.UUID `json:"id"`
	Username  *string   `json:"username"`
	AvatarURL *string   `json:"avatar_url"`
}

type CreateEventInput struct {
	UserID      uuid.UUID
	Title       string
	Description string
	CoverURL    *string
	Lon         float64 // GeoJSON lon,lat order
	Lat         float64
	Address     string
	StartsAt    time.Time
	EndsAt      *time.Time
	Visibility  string
}
