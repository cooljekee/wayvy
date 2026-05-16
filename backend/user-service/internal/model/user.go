package model

import "github.com/google/uuid"

// PublicUser is a minimal user representation returned in lists and search results.
type PublicUser struct {
	ID        uuid.UUID `json:"id"`
	Username  *string   `json:"username"`
	AvatarURL *string   `json:"avatar_url"`
}

// FollowPage is a paginated list of followers or following.
type FollowPage struct {
	Items []PublicUser `json:"items"`
	Total int          `json:"total"`
}

// Profile is the full public profile of a user, including social counters.
type Profile struct {
	ID             uuid.UUID `json:"id"`
	Username       *string   `json:"username"`
	AvatarURL      *string   `json:"avatar_url"`
	City           *string   `json:"city"`
	RoutesCount    int       `json:"routes_count"`
	FollowersCount int       `json:"followers_count"`
	FollowingCount int       `json:"following_count"`
	IsFollowing    bool      `json:"is_following"`
}
