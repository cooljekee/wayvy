package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/cooljekee/wayvy/user-service/internal/model"
)

var ErrSelfFollow = errors.New("cannot follow yourself")

const followCacheTTL = 5 * time.Minute

type FollowStorer interface {
	Follow(ctx context.Context, followerID, followingID uuid.UUID) error
	Unfollow(ctx context.Context, followerID, followingID uuid.UUID) error
	AllFollowers(ctx context.Context, userID uuid.UUID) ([]model.PublicUser, error)
	AllFollowing(ctx context.Context, userID uuid.UUID) ([]model.PublicUser, error)
}

type SocialService struct {
	store FollowStorer
	redis *redis.Client
}

func NewSocialService(store FollowStorer, rdb *redis.Client) *SocialService {
	return &SocialService{store: store, redis: rdb}
}

func (s *SocialService) Follow(ctx context.Context, followerID, followingID uuid.UUID) error {
	if followerID == followingID {
		return ErrSelfFollow
	}
	if err := s.store.Follow(ctx, followerID, followingID); err != nil {
		return fmt.Errorf("SocialService.Follow: %w", err)
	}
	s.invalidateFollowCache(ctx, followerID, followingID)
	return nil
}

func (s *SocialService) Unfollow(ctx context.Context, followerID, followingID uuid.UUID) error {
	if followerID == followingID {
		return ErrSelfFollow
	}
	if err := s.store.Unfollow(ctx, followerID, followingID); err != nil {
		return fmt.Errorf("SocialService.Unfollow: %w", err)
	}
	s.invalidateFollowCache(ctx, followerID, followingID)
	return nil
}

// Followers returns a paginated list of users following userID.
// Cache key: followers:{userID} — full list, TTL 5 min. Pagination sliced in memory.
func (s *SocialService) Followers(ctx context.Context, userID uuid.UUID, limit, offset int) (model.FollowPage, error) {
	all, err := s.cachedList(ctx, followersKey(userID), func() ([]model.PublicUser, error) {
		return s.store.AllFollowers(ctx, userID)
	})
	if err != nil {
		return model.FollowPage{}, fmt.Errorf("SocialService.Followers: %w", err)
	}
	return paginate(all, limit, offset), nil
}

// Following returns a paginated list of users that userID follows.
// Cache key: following:{userID} — full list, TTL 5 min. Pagination sliced in memory.
func (s *SocialService) Following(ctx context.Context, userID uuid.UUID, limit, offset int) (model.FollowPage, error) {
	all, err := s.cachedList(ctx, followingKey(userID), func() ([]model.PublicUser, error) {
		return s.store.AllFollowing(ctx, userID)
	})
	if err != nil {
		return model.FollowPage{}, fmt.Errorf("SocialService.Following: %w", err)
	}
	return paginate(all, limit, offset), nil
}

// cachedList tries Redis first; on miss calls fetchFn, caches the result, and returns it.
func (s *SocialService) cachedList(ctx context.Context, key string, fetchFn func() ([]model.PublicUser, error)) ([]model.PublicUser, error) {
	raw, err := s.redis.Get(ctx, key).Bytes()
	if err == nil {
		var list []model.PublicUser
		if json.Unmarshal(raw, &list) == nil {
			return list, nil
		}
	}

	list, err := fetchFn()
	if err != nil {
		return nil, err
	}

	if data, err := json.Marshal(list); err == nil {
		s.redis.Set(ctx, key, data, followCacheTTL)
	}
	return list, nil
}

func (s *SocialService) invalidateFollowCache(ctx context.Context, followerID, followingID uuid.UUID) {
	s.redis.Del(ctx, followersKey(followingID)) // people following the target
	s.redis.Del(ctx, followingKey(followerID))  // people the actor follows
}

func followersKey(userID uuid.UUID) string { return "followers:" + userID.String() }
func followingKey(userID uuid.UUID) string { return "following:" + userID.String() }

func paginate(all []model.PublicUser, limit, offset int) model.FollowPage {
	total := len(all)
	if offset >= total {
		return model.FollowPage{Items: []model.PublicUser{}, Total: total}
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return model.FollowPage{Items: all[offset:end], Total: total}
}
