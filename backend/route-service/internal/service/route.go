package service

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/cooljekee/wayvy/route-service/internal/model"
)

var (
	ErrNotFound   = errors.New("route not found")
	ErrForbidden  = errors.New("not the route owner")
	ErrValidation = errors.New("invalid input")
)

type RouteStorer interface {
	Create(ctx context.Context, in model.CreateRouteInput) (*model.Route, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.Route, error)
	GetByIDForViewer(ctx context.Context, routeID, viewerID uuid.UUID) (*model.Route, error)
	Delete(ctx context.Context, routeID, userID uuid.UUID) (bool, error)
	Feed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Route, int, error)
}

type RouteService struct {
	store RouteStorer
}

func NewRouteService(store RouteStorer) *RouteService {
	return &RouteService{store: store}
}

func (s *RouteService) CreateRoute(ctx context.Context, in model.CreateRouteInput) (*model.Route, error) {
	return s.store.Create(ctx, in)
}

func (s *RouteService) ListMyRoutes(ctx context.Context, userID uuid.UUID) ([]*model.Route, error) {
	return s.store.ListByUser(ctx, userID)
}

func (s *RouteService) GetRoute(ctx context.Context, routeID, viewerID uuid.UUID) (*model.Route, error) {
	r, err := s.store.GetByIDForViewer(ctx, routeID, viewerID)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, ErrNotFound
	}
	return r, nil
}

func (s *RouteService) DeleteRoute(ctx context.Context, routeID, userID uuid.UUID) error {
	deleted, err := s.store.Delete(ctx, routeID, userID)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrNotFound
	}
	return nil
}

func (s *RouteService) GetFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Route, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.store.Feed(ctx, userID, limit, offset)
}
