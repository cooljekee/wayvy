package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cooljekee/wayvy/route-service/internal/model"
)

type WaypointStore struct {
	db *pgxpool.Pool
}

func NewWaypointStore(db *pgxpool.Pool) *WaypointStore {
	return &WaypointStore{db: db}
}

// columns returned by every waypoint SELECT — keeps scanWaypoint in sync.
const waypointCols = `
    id, user_id, route_id, title, description,
    ST_AsGeoJSON(location)::json AS location,
    address, place_name, place_yandex_id, place_category,
    order_index, visibility::text, cover_photo_url, created_at`

// $5 = lon, $6 = lat (GeoJSON spec: longitude first)
const createWaypointSQL = `
INSERT INTO waypoints (user_id, route_id, title, description, location, visibility)
VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7::visibility_enum)
RETURNING ` + waypointCols

func (s *WaypointStore) Create(ctx context.Context, in model.CreateWaypointInput) (*model.Waypoint, error) {
	row := s.db.QueryRow(ctx, createWaypointSQL,
		in.UserID, in.RouteID, in.Title, in.Description,
		in.Lon, in.Lat, // lon first for ST_MakePoint
		in.Visibility,
	)
	return scanWaypoint(row)
}

const getWaypointSQL = `
SELECT ` + waypointCols + `
FROM waypoints
WHERE id = $1
  AND (
      user_id = $2
      OR visibility = 'public'
      OR (visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = user_id
      ))
  )`

func (s *WaypointStore) GetByIDForViewer(ctx context.Context, waypointID, viewerID uuid.UUID) (*model.Waypoint, error) {
	return scanWaypoint(s.db.QueryRow(ctx, getWaypointSQL, waypointID, viewerID))
}

const listByRouteSQL = `
SELECT ` + waypointCols + `
FROM waypoints w
JOIN routes r ON r.id = w.route_id
WHERE w.route_id = $1
  AND (
      r.user_id = $2
      OR r.visibility = 'public'
      OR (r.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = r.user_id
      ))
  )
ORDER BY w.order_index ASC NULLS LAST, w.created_at ASC`

func (s *WaypointStore) ListByRoute(ctx context.Context, routeID, viewerID uuid.UUID) ([]*model.Waypoint, error) {
	rows, err := s.db.Query(ctx, listByRouteSQL, routeID, viewerID)
	if err != nil {
		return nil, fmt.Errorf("store.ListByRoute query: %w", err)
	}
	defer rows.Close()

	var waypoints []*model.Waypoint
	for rows.Next() {
		w, err := scanWaypoint(rows)
		if err != nil {
			return nil, fmt.Errorf("store.ListByRoute scan: %w", err)
		}
		waypoints = append(waypoints, w)
	}
	return waypoints, rows.Err()
}

// $1=lon, $2=lat, $3=radius_m, $4=viewerID
const nearbySQL = `
SELECT ` + waypointCols + `
FROM waypoints
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3
)
  AND user_id IS NOT NULL
  AND (
      visibility = 'public'
      OR user_id = $4
      OR (visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $4 AND following_id = user_id
      ))
  )
ORDER BY location::geography <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
LIMIT 50`

func (s *WaypointStore) Nearby(ctx context.Context, lon, lat float64, radiusM int, viewerID uuid.UUID) ([]*model.Waypoint, error) {
	rows, err := s.db.Query(ctx, nearbySQL, lon, lat, radiusM, viewerID)
	if err != nil {
		return nil, fmt.Errorf("store.Nearby query: %w", err)
	}
	defer rows.Close()

	var waypoints []*model.Waypoint
	for rows.Next() {
		w, err := scanWaypoint(rows)
		if err != nil {
			return nil, fmt.Errorf("store.Nearby scan: %w", err)
		}
		waypoints = append(waypoints, w)
	}
	return waypoints, rows.Err()
}

// AddPhoto inserts a photo and sets cover_photo_url on the waypoint if it has none yet.
// The caller must have already verified ownership of the waypoint.
const addPhotoSQL = `
INSERT INTO photos (waypoint_id, r2_key, url, order_index)
VALUES ($1, $2, $3,
    (SELECT COALESCE(MAX(order_index) + 1, 0) FROM photos WHERE waypoint_id = $1))
RETURNING id, waypoint_id, r2_key, url, order_index, created_at`

const updateCoverSQL = `
UPDATE waypoints SET cover_photo_url = $2 WHERE id = $1 AND cover_photo_url IS NULL`

func (s *WaypointStore) AddPhoto(ctx context.Context, in model.AddPhotoInput) (*model.Photo, error) {
	var p model.Photo
	err := s.db.QueryRow(ctx, addPhotoSQL, in.WaypointID, in.R2Key, in.URL).Scan(
		&p.ID, &p.WaypointID, &p.R2Key, &p.URL, &p.OrderIndex, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("store.AddPhoto insert: %w", err)
	}
	// Best-effort: set cover if none yet. Race-safe — WHERE IS NULL is idempotent.
	_, _ = s.db.Exec(ctx, updateCoverSQL, in.WaypointID, in.URL)
	return &p, nil
}

const listPhotosSQL = `
SELECT id, waypoint_id, r2_key, url, order_index, created_at
FROM photos
WHERE waypoint_id = $1
ORDER BY order_index ASC, created_at ASC`

func (s *WaypointStore) ListPhotos(ctx context.Context, waypointID uuid.UUID) ([]*model.Photo, error) {
	rows, err := s.db.Query(ctx, listPhotosSQL, waypointID)
	if err != nil {
		return nil, fmt.Errorf("store.ListPhotos query: %w", err)
	}
	defer rows.Close()

	var photos []*model.Photo
	for rows.Next() {
		var p model.Photo
		if err := rows.Scan(&p.ID, &p.WaypointID, &p.R2Key, &p.URL, &p.OrderIndex, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("store.ListPhotos scan: %w", err)
		}
		photos = append(photos, &p)
	}
	return photos, rows.Err()
}

func scanWaypoint(s scanner) (*model.Waypoint, error) {
	var w model.Waypoint
	err := s.Scan(
		&w.ID, &w.UserID, &w.RouteID, &w.Title, &w.Description,
		&w.Location,
		&w.Address, &w.PlaceName, &w.PlaceYandexID, &w.PlaceCategory,
		&w.OrderIndex, &w.Visibility, &w.CoverPhotoURL, &w.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("store.scanWaypoint: %w", err)
	}
	return &w, nil
}
