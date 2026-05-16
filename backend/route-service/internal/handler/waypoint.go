package handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	authmw "github.com/cooljekee/wayvy/route-service/internal/middleware"
	"github.com/cooljekee/wayvy/route-service/internal/model"
	"github.com/cooljekee/wayvy/route-service/internal/service"
)

type WaypointServicer interface {
	CreateWaypoint(ctx context.Context, in model.CreateWaypointInput) (*model.Waypoint, error)
	GetWaypoint(ctx context.Context, waypointID, viewerID uuid.UUID) (*model.Waypoint, error)
	ListByRoute(ctx context.Context, routeID, viewerID uuid.UUID) ([]*model.Waypoint, error)
	Nearby(ctx context.Context, lon, lat float64, radiusM int, viewerID uuid.UUID) ([]*model.Waypoint, error)
	AddPhoto(ctx context.Context, waypointID, ownerID uuid.UUID, r2Key, url string) (*model.Photo, error)
	ListPhotos(ctx context.Context, waypointID, viewerID uuid.UUID) ([]*model.Photo, error)
	MapQuery(ctx context.Context, viewerID uuid.UUID, lonMin, latMin, lonMax, latMax float64) ([]*model.Waypoint, error)
}

type WaypointHandler struct {
	svc WaypointServicer
}

func NewWaypointHandler(svc WaypointServicer) *WaypointHandler {
	return &WaypointHandler{svc: svc}
}

var validWaypointVisibility = map[string]bool{
	"public":    true,
	"followers": true,
	"private":   true,
}

// POST /waypoints
func (h *WaypointHandler) CreateWaypoint(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	var body struct {
		Lat         float64  `json:"lat"`
		Lon         float64  `json:"lon"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Visibility  string   `json:"visibility"`
		RouteID     *string  `json:"route_id"`
	}
	if err := decodeJSON(r, &body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON body", "BAD_REQUEST")
		return
	}
	if body.Lat == 0 && body.Lon == 0 {
		respondError(w, http.StatusUnprocessableEntity, "lat and lon are required", "VALIDATION_ERROR")
		return
	}
	if !validWaypointVisibility[body.Visibility] {
		respondError(w, http.StatusUnprocessableEntity, "visibility must be public, followers, or private", "VALIDATION_ERROR")
		return
	}

	in := model.CreateWaypointInput{
		UserID:      userID,
		Title:       body.Title,
		Description: body.Description,
		Lat:         body.Lat,
		Lon:         body.Lon,
		Visibility:  body.Visibility,
	}
	if body.RouteID != nil {
		id, err := uuid.Parse(*body.RouteID)
		if err != nil {
			respondError(w, http.StatusUnprocessableEntity, "invalid route_id", "VALIDATION_ERROR")
			return
		}
		in.RouteID = &id
	}

	wp, err := h.svc.CreateWaypoint(r.Context(), in)
	if err != nil {
		slog.ErrorContext(r.Context(), "CreateWaypoint internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to create waypoint", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, wp)
}

// GET /waypoints/{id}
func (h *WaypointHandler) GetWaypoint(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	waypointID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid waypoint id", "BAD_REQUEST")
		return
	}

	wp, err := h.svc.GetWaypoint(r.Context(), waypointID, viewerID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "waypoint not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "GetWaypoint internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get waypoint", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, wp)
}

// GET /routes/{id}/waypoints
func (h *WaypointHandler) ListByRoute(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	routeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid route id", "BAD_REQUEST")
		return
	}

	waypoints, err := h.svc.ListByRoute(r.Context(), routeID, viewerID)
	if err != nil {
		slog.ErrorContext(r.Context(), "ListByRoute internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list waypoints", "INTERNAL_ERROR")
		return
	}
	if waypoints == nil {
		waypoints = []*model.Waypoint{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": waypoints})
}

// GET /waypoints/nearby?lat=&lon=&radius_m=
func (h *WaypointHandler) Nearby(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	lat, errLat := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lon, errLon := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if errLat != nil || errLon != nil {
		respondError(w, http.StatusUnprocessableEntity, "lat and lon query params are required", "VALIDATION_ERROR")
		return
	}

	radiusM, _ := strconv.Atoi(r.URL.Query().Get("radius_m"))
	if radiusM <= 0 {
		radiusM = 1000
	}
	if radiusM > 10000 {
		radiusM = 10000
	}

	waypoints, err := h.svc.Nearby(r.Context(), lon, lat, radiusM, viewerID)
	if err != nil {
		slog.ErrorContext(r.Context(), "Nearby internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get nearby waypoints", "INTERNAL_ERROR")
		return
	}
	if waypoints == nil {
		waypoints = []*model.Waypoint{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": waypoints})
}

// POST /waypoints/{id}/photos
func (h *WaypointHandler) AddPhoto(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	waypointID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid waypoint id", "BAD_REQUEST")
		return
	}

	var body struct {
		R2Key string `json:"r2_key"`
		URL   string `json:"url"`
	}
	if err := decodeJSON(r, &body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON body", "BAD_REQUEST")
		return
	}
	if body.R2Key == "" || body.URL == "" {
		respondError(w, http.StatusUnprocessableEntity, "r2_key and url are required", "VALIDATION_ERROR")
		return
	}

	photo, err := h.svc.AddPhoto(r.Context(), waypointID, userID, body.R2Key, body.URL)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "waypoint not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "AddPhoto internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to add photo", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, photo)
}

// GET /waypoints/map?bbox=lonMin,latMin,lonMax,latMax
// Returns waypoints from followed users within the bbox (for Карта·все tab).
func (h *WaypointHandler) MapQuery(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	bbox := r.URL.Query().Get("bbox")
	if bbox == "" {
		respondError(w, http.StatusUnprocessableEntity, "bbox query param is required (lonMin,latMin,lonMax,latMax)", "VALIDATION_ERROR")
		return
	}

	var lonMin, latMin, lonMax, latMax float64
	n, _ := fmt.Sscanf(bbox, "%f,%f,%f,%f", &lonMin, &latMin, &lonMax, &latMax)
	if n != 4 {
		respondError(w, http.StatusUnprocessableEntity, "bbox must be lonMin,latMin,lonMax,latMax", "VALIDATION_ERROR")
		return
	}

	waypoints, err := h.svc.MapQuery(r.Context(), viewerID, lonMin, latMin, lonMax, latMax)
	if err != nil {
		slog.ErrorContext(r.Context(), "MapQuery internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to query map waypoints", "INTERNAL_ERROR")
		return
	}
	if waypoints == nil {
		waypoints = []*model.Waypoint{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": waypoints})
}

// GET /waypoints/{id}/photos
func (h *WaypointHandler) ListPhotos(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	waypointID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid waypoint id", "BAD_REQUEST")
		return
	}

	photos, err := h.svc.ListPhotos(r.Context(), waypointID, viewerID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "waypoint not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "ListPhotos internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list photos", "INTERNAL_ERROR")
		return
	}
	if photos == nil {
		photos = []*model.Photo{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": photos})
}
