package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cooljekee/wayvy/user-service/internal/model"
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

const searchUsersSQL = `
SELECT id, username, avatar_url
FROM users
WHERE username IS NOT NULL AND username ILIKE $1
LIMIT 20`

// SearchUsers returns users whose username matches q (case-insensitive prefix/suffix search).
func (s *UserStore) SearchUsers(ctx context.Context, q string) ([]model.PublicUser, error) {
	rows, err := s.db.Query(ctx, searchUsersSQL, "%"+q+"%")
	if err != nil {
		return nil, fmt.Errorf("store.SearchUsers: %w", err)
	}
	defer rows.Close()

	var users []model.PublicUser
	for rows.Next() {
		var u model.PublicUser
		if err := rows.Scan(&u.ID, &u.Username, &u.AvatarURL); err != nil {
			return nil, fmt.Errorf("store.SearchUsers scan: %w", err)
		}
		users = append(users, u)
	}
	if users == nil {
		users = []model.PublicUser{}
	}
	return users, rows.Err()
}

const getProfileSQL = `
SELECT
    u.id, u.username, u.avatar_url,
    (SELECT r.city FROM routes r WHERE r.user_id = u.id AND r.city IS NOT NULL
     ORDER BY r.created_at DESC LIMIT 1) AS city,
    (SELECT COUNT(*)::int FROM routes r2 WHERE r2.user_id = u.id
     AND r2.visibility IN ('public','followers')) AS routes_count,
    (SELECT COUNT(*)::int FROM follows f1 WHERE f1.following_id = u.id) AS followers_count,
    (SELECT COUNT(*)::int FROM follows f2 WHERE f2.follower_id = u.id) AS following_count,
    EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = $2 AND f3.following_id = u.id) AS is_following
FROM users u
WHERE u.id = $1`

// GetProfile returns a public profile for profileUserID, with is_following relative to viewerID.
// Returns service.ErrNotFound if the user does not exist.
func (s *UserStore) GetProfile(ctx context.Context, profileUserID, viewerID uuid.UUID) (*model.Profile, error) {
	var p model.Profile
	err := s.db.QueryRow(ctx, getProfileSQL, profileUserID, viewerID).Scan(
		&p.ID, &p.Username, &p.AvatarURL,
		&p.City,
		&p.RoutesCount, &p.FollowersCount, &p.FollowingCount,
		&p.IsFollowing,
	)
	if err != nil {
		return nil, fmt.Errorf("store.GetProfile: %w", err) // includes pgx.ErrNoRows for service to detect
	}
	return &p, nil
}
