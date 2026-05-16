package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/cooljekee/wayvy/event-service/internal/model"
)

var (
	ErrNotFound  = errors.New("event not found")
	ErrForbidden = errors.New("not the event owner")
)

type EventStorer interface {
	Create(ctx context.Context, in model.CreateEventInput) (*model.Event, error)
	List(ctx context.Context, viewerID uuid.UUID, limit, offset int) ([]*model.Event, int, error)
	GetByID(ctx context.Context, eventID, viewerID uuid.UUID) (*model.Event, error)
	Delete(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	Nearby(ctx context.Context, lon, lat float64, radiusM int, from time.Time, viewerID uuid.UUID) ([]*model.Event, error)
	Attend(ctx context.Context, eventID, userID uuid.UUID) error
	Unattend(ctx context.Context, eventID, userID uuid.UUID) error
	ListAttendees(ctx context.Context, eventID uuid.UUID, limit int) ([]*model.AttendeeUser, error)
}

type EventService struct{ store EventStorer }

func NewEventService(store EventStorer) *EventService { return &EventService{store: store} }

func (s *EventService) CreateEvent(ctx context.Context, in model.CreateEventInput) (*model.Event, error) {
	return s.store.Create(ctx, in)
}

func (s *EventService) ListEvents(ctx context.Context, viewerID uuid.UUID, limit, offset int) ([]*model.Event, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.store.List(ctx, viewerID, limit, offset)
}

func (s *EventService) GetEvent(ctx context.Context, eventID, viewerID uuid.UUID) (*model.Event, error) {
	e, err := s.store.GetByID(ctx, eventID, viewerID)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, ErrNotFound
	}
	return e, nil
}

func (s *EventService) DeleteEvent(ctx context.Context, eventID, userID uuid.UUID) error {
	deleted, err := s.store.Delete(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrNotFound
	}
	return nil
}

// NearbyEvents returns events within radiusM metres of (lon, lat) starting from `from`.
// Defaults to 5000 m if radiusM <= 0.
func (s *EventService) NearbyEvents(ctx context.Context, lon, lat float64, radiusM int, from time.Time, viewerID uuid.UUID) ([]*model.Event, error) {
	if radiusM <= 0 {
		radiusM = 5000
	}
	return s.store.Nearby(ctx, lon, lat, radiusM, from, viewerID)
}

func (s *EventService) AttendEvent(ctx context.Context, eventID, userID uuid.UUID) error {
	return s.store.Attend(ctx, eventID, userID)
}

func (s *EventService) UnattendEvent(ctx context.Context, eventID, userID uuid.UUID) error {
	return s.store.Unattend(ctx, eventID, userID)
}

func (s *EventService) ListAttendees(ctx context.Context, eventID uuid.UUID) ([]*model.AttendeeUser, error) {
	return s.store.ListAttendees(ctx, eventID, 100)
}
