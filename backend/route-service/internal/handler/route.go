package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	authmw "github.com/cooljekee/wayvy/route-service/internal/middleware"
	"github.com/cooljekee/wayvy/route-service/internal/model"
	"github.com/cooljekee/wayvy/route-service/internal/service"
)

type RouteServicer interface {
	CreateRoute(ctx context.Context, in model.CreateRouteInput) (*model.Route, error)
	ListMyRoutes(ctx context.Context, userID uuid.UUID) ([]*model.Route, error)
	GetRoute(ctx context.Context, routeID, viewerID uuid.UUID) (*model.Route, error)
	DeleteRoute(ctx context.Context, routeID, userID uuid.UUID) error
	GetFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Route, int, error)
}

type RouteHandler struct {
	svc RouteServicer
}

func NewRouteHandler(svc RouteServicer) *RouteHandler {
	return &RouteHandler{svc: svc}
}

var validVisibility = map[string]bool{
	"public":    true,
	"followers": true,
	"private":   true,
}

// POST /routes
func (h *RouteHandler) CreateRoute(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB for GPS track

	userID := authmw.MustUserIDFromCtx(r.Context())

	var body struct {
		Title      *string         `json:"title"`
		GpsTrack   json.RawMessage `json:"gps_track"`
		City       *string         `json:"city"`
		Visibility string          `json:"visibility"`
		StartedAt  time.Time       `json:"started_at"`
		FinishedAt time.Time       `json:"finished_at"`
		DurationS  int             `json:"duration_s"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON body", "BAD_REQUEST")
		return
	}
	if !isLineString(body.GpsTrack) {
		respondError(w, http.StatusUnprocessableEntity, "gps_track must be a GeoJSON LineString", "VALIDATION_ERROR")
		return
	}
	if !validVisibility[body.Visibility] {
		respondError(w, http.StatusUnprocessableEntity, "visibility must be public, followers, or private", "VALIDATION_ERROR")
		return
	}
	if body.StartedAt.IsZero() || body.FinishedAt.IsZero() {
		respondError(w, http.StatusUnprocessableEntity, "started_at and finished_at are required", "VALIDATION_ERROR")
		return
	}
	if !body.FinishedAt.After(body.StartedAt) {
		respondError(w, http.StatusUnprocessableEntity, "finished_at must be after started_at", "VALIDATION_ERROR")
		return
	}

	route, err := h.svc.CreateRoute(r.Context(), model.CreateRouteInput{
		UserID:     userID,
		Title:      body.Title,
		City:       body.City,
		GpsTrack:   body.GpsTrack,
		DurationS:  body.DurationS,
		Visibility: body.Visibility,
		StartedAt:  body.StartedAt,
		FinishedAt: body.FinishedAt,
	})
	if err != nil {
		slog.ErrorContext(r.Context(), "CreateRoute internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to create route", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, route)
}

// GET /routes
func (h *RouteHandler) ListMyRoutes(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	routes, err := h.svc.ListMyRoutes(r.Context(), userID)
	if err != nil {
		slog.ErrorContext(r.Context(), "ListMyRoutes internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list routes", "INTERNAL_ERROR")
		return
	}
	if routes == nil {
		routes = []*model.Route{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": routes})
}

// GET /routes/{id}
func (h *RouteHandler) GetRoute(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	routeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid route id", "BAD_REQUEST")
		return
	}

	route, err := h.svc.GetRoute(r.Context(), routeID, viewerID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "route not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "GetRoute internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get route", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, route)
}

// DELETE /routes/{id}
func (h *RouteHandler) DeleteRoute(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	routeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid route id", "BAD_REQUEST")
		return
	}

	if err := h.svc.DeleteRoute(r.Context(), routeID, userID); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "route not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "DeleteRoute internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to delete route", "INTERNAL_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /routes/feed
func (h *RouteHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	routes, total, err := h.svc.GetFeed(r.Context(), userID, limit, offset)
	if err != nil {
		slog.ErrorContext(r.Context(), "GetFeed internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get feed", "INTERNAL_ERROR")
		return
	}
	if routes == nil {
		routes = []*model.Route{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": routes, "total": total})
}

// isLineString validates that raw is a GeoJSON object with type "LineString".
func isLineString(raw json.RawMessage) bool {
	if len(raw) == 0 {
		return false
	}
	var shape struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(raw, &shape); err != nil {
		return false
	}
	return shape.Type == "LineString"
}
