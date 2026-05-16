package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	authmw "github.com/cooljekee/wayvy/user-service/internal/middleware"
	"github.com/cooljekee/wayvy/user-service/internal/model"
	"github.com/cooljekee/wayvy/user-service/internal/service"
)

// SocialServicer covers follow/unfollow and paginated lists.
type SocialServicer interface {
	Follow(ctx context.Context, followerID, followingID uuid.UUID) error
	Unfollow(ctx context.Context, followerID, followingID uuid.UUID) error
	Followers(ctx context.Context, userID uuid.UUID, limit, offset int) (model.FollowPage, error)
	Following(ctx context.Context, userID uuid.UUID, limit, offset int) (model.FollowPage, error)
}

// UserServicer covers search and profile.
type UserServicer interface {
	Search(ctx context.Context, q string) ([]model.PublicUser, error)
	GetProfile(ctx context.Context, profileUserID, viewerID uuid.UUID) (*model.Profile, error)
}

type UserHandler struct {
	social SocialServicer
	users  UserServicer
}

func NewUserHandler(social SocialServicer, users UserServicer) *UserHandler {
	return &UserHandler{social: social, users: users}
}

// POST /users/{id}/follow
func (h *UserHandler) Follow(w http.ResponseWriter, r *http.Request) {
	actorID := authmw.MustUserIDFromCtx(r.Context())

	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}

	if err := h.social.Follow(r.Context(), actorID, targetID); err != nil {
		if errors.Is(err, service.ErrSelfFollow) {
			respondError(w, http.StatusBadRequest, "cannot follow yourself", "BAD_REQUEST")
			return
		}
		slog.ErrorContext(r.Context(), "Follow error", "err", err)
		respondError(w, http.StatusInternalServerError, "follow failed", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusNoContent, nil)
}

// DELETE /users/{id}/follow
func (h *UserHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	actorID := authmw.MustUserIDFromCtx(r.Context())

	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}

	if err := h.social.Unfollow(r.Context(), actorID, targetID); err != nil {
		if errors.Is(err, service.ErrSelfFollow) {
			respondError(w, http.StatusBadRequest, "cannot unfollow yourself", "BAD_REQUEST")
			return
		}
		slog.ErrorContext(r.Context(), "Unfollow error", "err", err)
		respondError(w, http.StatusInternalServerError, "unfollow failed", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusNoContent, nil)
}

// GET /users/{id}/followers?limit=20&offset=0
func (h *UserHandler) Followers(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}
	limit, offset := parsePagination(r)

	page, err := h.social.Followers(r.Context(), targetID, limit, offset)
	if err != nil {
		slog.ErrorContext(r.Context(), "Followers error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list followers", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, page)
}

// GET /users/{id}/following?limit=20&offset=0
func (h *UserHandler) Following(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}
	limit, offset := parsePagination(r)

	page, err := h.social.Following(r.Context(), targetID, limit, offset)
	if err != nil {
		slog.ErrorContext(r.Context(), "Following error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list following", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, page)
}

// GET /users/search?q=   (public — no JWT required)
func (h *UserHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		respondError(w, http.StatusUnprocessableEntity, "q must be at least 2 characters", "VALIDATION_ERROR")
		return
	}

	results, err := h.users.Search(r.Context(), q)
	if err != nil {
		slog.ErrorContext(r.Context(), "Search error", "err", err)
		respondError(w, http.StatusInternalServerError, "search failed", "INTERNAL_ERROR")
		return
	}
	if results == nil {
		results = []model.PublicUser{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": results})
}

// GET /users/{id}/profile
func (h *UserHandler) Profile(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	profileID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}

	profile, err := h.users.GetProfile(r.Context(), profileID, viewerID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "user not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "Profile error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get profile", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

func parsePagination(r *http.Request) (limit, offset int) {
	limit, _ = strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset, _ = strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	return
}
