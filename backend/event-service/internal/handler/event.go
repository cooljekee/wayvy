package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	authmw "github.com/cooljekee/wayvy/event-service/internal/middleware"
	"github.com/cooljekee/wayvy/event-service/internal/model"
	"github.com/cooljekee/wayvy/event-service/internal/service"
)

type EventServicer interface {
	CreateEvent(ctx context.Context, in model.CreateEventInput) (*model.Event, error)
	ListEvents(ctx context.Context, viewerID uuid.UUID, limit, offset int) ([]*model.Event, int, error)
	GetEvent(ctx context.Context, eventID, viewerID uuid.UUID) (*model.Event, error)
	DeleteEvent(ctx context.Context, eventID, userID uuid.UUID) error
}

type EventHandler struct {
	svc EventServicer
}

func NewEventHandler(svc EventServicer) *EventHandler {
	return &EventHandler{svc: svc}
}

var validEventVisibility = map[string]bool{"public": true, "followers": true}

// POST /events
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB

	userID := authmw.MustUserIDFromCtx(r.Context())

	var body struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		CoverURL    *string    `json:"cover_url"`
		Lon         float64    `json:"lon"`
		Lat         float64    `json:"lat"`
		Address     string     `json:"address"`
		StartsAt    time.Time  `json:"starts_at"`
		EndsAt      *time.Time `json:"ends_at"`
		Visibility  string     `json:"visibility"`
	}
	if err := decodeJSON(r, &body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON body", "BAD_REQUEST")
		return
	}
	if body.Title == "" {
		respondError(w, http.StatusUnprocessableEntity, "title is required", "VALIDATION_ERROR")
		return
	}
	if !validEventVisibility[body.Visibility] {
		respondError(w, http.StatusUnprocessableEntity, "visibility must be public or followers", "VALIDATION_ERROR")
		return
	}
	if body.StartsAt.IsZero() {
		respondError(w, http.StatusUnprocessableEntity, "starts_at is required", "VALIDATION_ERROR")
		return
	}

	event, err := h.svc.CreateEvent(r.Context(), model.CreateEventInput{
		UserID:      userID,
		Title:       body.Title,
		Description: body.Description,
		CoverURL:    body.CoverURL,
		Lon:         body.Lon,
		Lat:         body.Lat,
		Address:     body.Address,
		StartsAt:    body.StartsAt,
		EndsAt:      body.EndsAt,
		Visibility:  body.Visibility,
	})
	if err != nil {
		slog.ErrorContext(r.Context(), "CreateEvent internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to create event", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, event)
}

// GET /events
func (h *EventHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	events, total, err := h.svc.ListEvents(r.Context(), viewerID, limit, offset)
	if err != nil {
		slog.ErrorContext(r.Context(), "ListEvents internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to list events", "INTERNAL_ERROR")
		return
	}
	if events == nil {
		events = []*model.Event{}
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": events, "total": total})
}

// GET /events/{id}
func (h *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	viewerID := authmw.MustUserIDFromCtx(r.Context())

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid event id", "BAD_REQUEST")
		return
	}

	event, err := h.svc.GetEvent(r.Context(), eventID, viewerID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "event not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "GetEvent internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to get event", "INTERNAL_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, event)
}

// DELETE /events/{id}
func (h *EventHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	userID := authmw.MustUserIDFromCtx(r.Context())

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid event id", "BAD_REQUEST")
		return
	}

	if err := h.svc.DeleteEvent(r.Context(), eventID, userID); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respondError(w, http.StatusNotFound, "event not found", "NOT_FOUND")
			return
		}
		slog.ErrorContext(r.Context(), "DeleteEvent internal error", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to delete event", "INTERNAL_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /events/nearby — stub for Task 3
func (h *EventHandler) Nearby(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]any{"items": []struct{}{}})
}
