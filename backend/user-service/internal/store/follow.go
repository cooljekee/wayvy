package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cooljekee/wayvy/user-service/internal/model"
)

type FollowStore struct {
	db *pgxpool.Pool
}

func NewFollowStore(db *pgxpool.Pool) *FollowStore {
	return &FollowStore{db: db}
}

const followSQL = `
INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING`

func (s *FollowStore) Follow(ctx context.Context, followerID, followingID uuid.UUID) error {
	_, err := s.db.Exec(ctx, followSQL, followerID, followingID)
	if err != nil {
		return fmt.Errorf("store.Follow: %w", err)
	}
	return nil
}

const unfollowSQL = `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`

func (s *FollowStore) Unfollow(ctx context.Context, followerID, followingID uuid.UUID) error {
	_, err := s.db.Exec(ctx, unfollowSQL, followerID, followingID)
	if err != nil {
		return fmt.Errorf("store.Unfollow: %w", err)
	}
	return nil
}

// AllFollowers returns the complete list of users following userID, ordered by follow date desc.
// Used for Redis caching — the service handles pagination in-memory.
const allFollowersSQL = `
SELECT u.id, u.username, u.avatar_url
FROM follows f
JOIN users u ON u.id = f.follower_id
WHERE f.following_id = $1
ORDER BY f.created_at DESC`

func (s *FollowStore) AllFollowers(ctx context.Context, userID uuid.UUID) ([]model.PublicUser, error) {
	rows, err := s.db.Query(ctx, allFollowersSQL, userID)
	if err != nil {
		return nil, fmt.Errorf("store.AllFollowers: %w", err)
	}
	defer rows.Close()

	var users []model.PublicUser
	for rows.Next() {
		var u model.PublicUser
		if err := rows.Scan(&u.ID, &u.Username, &u.AvatarURL); err != nil {
			return nil, fmt.Errorf("store.AllFollowers scan: %w", err)
		}
		users = append(users, u)
	}
	if users == nil {
		users = []model.PublicUser{}
	}
	return users, rows.Err()
}

// AllFollowing returns the complete list of users that userID follows, ordered by follow date desc.
const allFollowingSQL = `
SELECT u.id, u.username, u.avatar_url
FROM follows f
JOIN users u ON u.id = f.following_id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC`

func (s *FollowStore) AllFollowing(ctx context.Context, userID uuid.UUID) ([]model.PublicUser, error) {
	rows, err := s.db.Query(ctx, allFollowingSQL, userID)
	if err != nil {
		return nil, fmt.Errorf("store.AllFollowing: %w", err)
	}
	defer rows.Close()

	var users []model.PublicUser
	for rows.Next() {
		var u model.PublicUser
		if err := rows.Scan(&u.ID, &u.Username, &u.AvatarURL); err != nil {
			return nil, fmt.Errorf("store.AllFollowing scan: %w", err)
		}
		users = append(users, u)
	}
	if users == nil {
		users = []model.PublicUser{}
	}
	return users, rows.Err()
}
