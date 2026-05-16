package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Waypoint struct {
	ID             uuid.UUID       `json:"id"`
	UserID         *uuid.UUID      `json:"user_id"`
	RouteID        *uuid.UUID      `json:"route_id"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	Location       json.RawMessage `json:"location"` // GeoJSON Point
	Address        string          `json:"address"`
	PlaceName      *string         `json:"place_name"`
	PlaceYandexID  *string         `json:"place_yandex_id"`
	PlaceCategory  *string         `json:"place_category"`
	OrderIndex     *int            `json:"order_index"`
	Visibility     string          `json:"visibility"`
	CoverPhotoURL  *string         `json:"cover_photo_url"`
	CreatedAt      time.Time       `json:"created_at"`
}

type CreateWaypointInput struct {
	UserID      uuid.UUID
	RouteID     *uuid.UUID
	Title       string
	Description string
	Lat         float64
	Lon         float64
	Visibility  string
}

type Photo struct {
	ID         uuid.UUID `json:"id"`
	WaypointID uuid.UUID `json:"waypoint_id"`
	R2Key      string    `json:"r2_key"`
	URL        string    `json:"url"`
	OrderIndex int       `json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
}

type AddPhotoInput struct {
	WaypointID uuid.UUID
	R2Key      string
	URL        string
}
