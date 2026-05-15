package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cooljekee/wayvy/route-service/internal/model"
)

type RouteStore struct {
	db *pgxpool.Pool
}

func NewRouteStore(db *pgxpool.Pool) *RouteStore {
	return &RouteStore{db: db}
}

const createRouteSQL = `
WITH g AS (
    SELECT ST_SetSRID(ST_GeomFromGeoJSON($4::text), 4326) AS geom
)
INSERT INTO routes (user_id, title, city, gps_track, distance_m, duration_s, visibility, started_at, finished_at)
SELECT $1, $2, $3, geom, ST_Length(geom::geography)::int, $5, $6::visibility_enum, $7, $8
FROM g
RETURNING id, user_id, title, city,
    ST_AsGeoJSON(gps_track)::json AS gps_track,
    distance_m, duration_s, visibility::text,
    started_at, finished_at, created_at`

func (s *RouteStore) Create(ctx context.Context, in model.CreateRouteInput) (*model.Route, error) {
	row := s.db.QueryRow(ctx, createRouteSQL,
		in.UserID, in.Title, in.City, string(in.GpsTrack),
		in.DurationS, in.Visibility, in.StartedAt, in.FinishedAt,
	)
	return scanRoute(row)
}

const listMyRoutesSQL = `
SELECT id, user_id, title, city,
    ST_AsGeoJSON(gps_track)::json AS gps_track,
    distance_m, duration_s, visibility::text,
    started_at, finished_at, created_at
FROM routes
WHERE user_id = $1
ORDER BY created_at DESC`

func (s *RouteStore) ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.Route, error) {
	rows, err := s.db.Query(ctx, listMyRoutesSQL, userID)
	if err != nil {
		return nil, fmt.Errorf("store.ListByUser query: %w", err)
	}
	defer rows.Close()

	var routes []*model.Route
	for rows.Next() {
		r, err := scanRoute(rows)
		if err != nil {
			return nil, fmt.Errorf("store.ListByUser scan: %w", err)
		}
		routes = append(routes, r)
	}
	return routes, rows.Err()
}

const getRouteSQL = `
SELECT id, user_id, title, city,
    ST_AsGeoJSON(gps_track)::json AS gps_track,
    distance_m, duration_s, visibility::text,
    started_at, finished_at, created_at
FROM routes
WHERE id = $1
  AND (
      user_id = $2
      OR visibility = 'public'
      OR (visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = user_id
      ))
  )`

func (s *RouteStore) GetByIDForViewer(ctx context.Context, routeID, viewerID uuid.UUID) (*model.Route, error) {
	return scanRoute(s.db.QueryRow(ctx, getRouteSQL, routeID, viewerID))
}

const deleteRouteSQL = `DELETE FROM routes WHERE id = $1 AND user_id = $2`

// Delete removes a route owned by userID. Returns (true, nil) if deleted, (false, nil) if not found/not owner.
func (s *RouteStore) Delete(ctx context.Context, routeID, userID uuid.UUID) (bool, error) {
	tag, err := s.db.Exec(ctx, deleteRouteSQL, routeID, userID)
	if err != nil {
		return false, fmt.Errorf("store.Delete: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

const feedSQL = `
SELECT r.id, r.user_id, r.title, r.city,
    ST_AsGeoJSON(r.gps_track)::json AS gps_track,
    r.distance_m, r.duration_s, r.visibility::text,
    r.started_at, r.finished_at, r.created_at
FROM routes r
JOIN follows f ON f.following_id = r.user_id
WHERE f.follower_id = $1
  AND r.visibility IN ('public', 'followers')
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3`

const feedCountSQL = `
SELECT COUNT(*)
FROM routes r
JOIN follows f ON f.following_id = r.user_id
WHERE f.follower_id = $1
  AND r.visibility IN ('public', 'followers')`

func (s *RouteStore) Feed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Route, int, error) {
	var total int
	if err := s.db.QueryRow(ctx, feedCountSQL, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("store.Feed count: %w", err)
	}

	rows, err := s.db.Query(ctx, feedSQL, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("store.Feed query: %w", err)
	}
	defer rows.Close()

	var routes []*model.Route
	for rows.Next() {
		r, err := scanRoute(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("store.Feed scan: %w", err)
		}
		routes = append(routes, r)
	}
	return routes, total, rows.Err()
}

// scanner is satisfied by both pgx.Row and pgx.Rows.
type scanner interface {
	Scan(dest ...any) error
}

func scanRoute(s scanner) (*model.Route, error) {
	var r model.Route
	err := s.Scan(
		&r.ID, &r.UserID, &r.Title, &r.City,
		&r.GpsTrack,
		&r.DistanceM, &r.DurationS, &r.Visibility,
		&r.StartedAt, &r.FinishedAt, &r.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("store.scanRoute: %w", err)
	}
	return &r, nil
}
