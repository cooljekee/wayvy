package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/cooljekee/wayvy/route-service/internal/model"
)

type WaypointStorer interface {
	Create(ctx context.Context, in model.CreateWaypointInput) (*model.Waypoint, error)
	GetByIDForViewer(ctx context.Context, waypointID, viewerID uuid.UUID) (*model.Waypoint, error)
	ListByRoute(ctx context.Context, routeID, viewerID uuid.UUID) ([]*model.Waypoint, error)
	Nearby(ctx context.Context, lon, lat float64, radiusM int, viewerID uuid.UUID) ([]*model.Waypoint, error)
	AddPhoto(ctx context.Context, in model.AddPhotoInput) (*model.Photo, error)
	ListPhotos(ctx context.Context, waypointID uuid.UUID) ([]*model.Photo, error)
}

type WaypointService struct {
	store WaypointStorer
}

func NewWaypointService(store WaypointStorer) *WaypointService {
	return &WaypointService{store: store}
}

func (s *WaypointService) CreateWaypoint(ctx context.Context, in model.CreateWaypointInput) (*model.Waypoint, error) {
	return s.store.Create(ctx, in)
}

func (s *WaypointService) GetWaypoint(ctx context.Context, waypointID, viewerID uuid.UUID) (*model.Waypoint, error) {
	w, err := s.store.GetByIDForViewer(ctx, waypointID, viewerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("WaypointService.GetWaypoint: %w", err)
	}
	return w, nil
}

func (s *WaypointService) ListByRoute(ctx context.Context, routeID, viewerID uuid.UUID) ([]*model.Waypoint, error) {
	return s.store.ListByRoute(ctx, routeID, viewerID)
}

func (s *WaypointService) Nearby(ctx context.Context, lon, lat float64, radiusM int, viewerID uuid.UUID) ([]*model.Waypoint, error) {
	return s.store.Nearby(ctx, lon, lat, radiusM, viewerID)
}

// AddPhoto verifies the viewer owns the waypoint, then adds the photo.
func (s *WaypointService) AddPhoto(ctx context.Context, waypointID, ownerID uuid.UUID, r2Key, url string) (*model.Photo, error) {
	w, err := s.store.GetByIDForViewer(ctx, waypointID, ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("WaypointService.AddPhoto get: %w", err)
	}
	// Only the owner may attach photos.
	if w.UserID == nil || *w.UserID != ownerID {
		return nil, ErrNotFound // don't reveal existence to non-owner
	}
	return s.store.AddPhoto(ctx, model.AddPhotoInput{
		WaypointID: waypointID,
		R2Key:      r2Key,
		URL:        url,
	})
}

// ListPhotos returns photos for a waypoint visible to viewerID.
func (s *WaypointService) ListPhotos(ctx context.Context, waypointID, viewerID uuid.UUID) ([]*model.Photo, error) {
	if _, err := s.GetWaypoint(ctx, waypointID, viewerID); err != nil {
		return nil, err
	}
	return s.store.ListPhotos(ctx, waypointID)
}
