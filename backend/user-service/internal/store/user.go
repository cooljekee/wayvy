package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserStore struct {
	db *pgxpool.Pool
}

func NewUserStore(db *pgxpool.Pool) *UserStore {
	return &UserStore{db: db}
}

// FindOrCreateByPhone вставляет пользователя с номером phone (E.164) или
// возвращает id существующего. DO NOTHING избегает phantom write при конфликте;
// если конфликт — делаем отдельный SELECT.
func (s *UserStore) FindOrCreateByPhone(ctx context.Context, phone string) (uuid.UUID, error) {
	const insertQ = `
		INSERT INTO users (phone)
		VALUES ($1)
		ON CONFLICT (phone) DO NOTHING
		RETURNING id`
	const selectQ = `SELECT id FROM users WHERE phone = $1`

	var id uuid.UUID
	err := s.db.QueryRow(ctx, insertQ, phone).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		// user already exists — fetch their id
		err = s.db.QueryRow(ctx, selectQ, phone).Scan(&id)
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("store.FindOrCreateByPhone: %w", err)
	}
	return id, nil
}
