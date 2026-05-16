package service

import (
	"context"
	"errors"

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
