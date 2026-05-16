package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/cooljekee/wayvy/user-service/internal/model"
)

var ErrNotFound = errors.New("not found")

type UserQuerier interface {
	SearchUsers(ctx context.Context, q string) ([]model.PublicUser, error)
	GetProfile(ctx context.Context, profileUserID, viewerID uuid.UUID) (*model.Profile, error)
}

type UserService struct {
	store UserQuerier
}

func NewUserService(store UserQuerier) *UserService {
	return &UserService{store: store}
}

func (s *UserService) Search(ctx context.Context, q string) ([]model.PublicUser, error) {
	results, err := s.store.SearchUsers(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("UserService.Search: %w", err)
	}
	return results, nil
}

func (s *UserService) GetProfile(ctx context.Context, profileUserID, viewerID uuid.UUID) (*model.Profile, error) {
	p, err := s.store.GetProfile(ctx, profileUserID, viewerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("UserService.GetProfile: %w", err)
	}
	return p, nil
}
