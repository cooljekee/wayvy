package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/cooljekee/wayvy/user-service/internal/service"
)

// AuthServicer определяет контракт сервиса авторизации для handler-слоя.
type AuthServicer interface {
	RequestOTP(ctx context.Context, phone string) error
	VerifyOTP(ctx context.Context, phone, code string) (string, error)
}

type AuthHandler struct {
	svc AuthServicer
}

func NewAuthHandler(svc AuthServicer) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type otpRequestBody struct {
	Phone string `json:"phone"`
}

type otpVerifyBody struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// POST /auth/otp/request
func (h *AuthHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10) // 1 KB

	var body otpRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Phone == "" {
		respondError(w, http.StatusBadRequest, "phone is required", "BAD_REQUEST")
		return
	}

	if err := h.svc.RequestOTP(r.Context(), body.Phone); err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidPhone):
			respondError(w, http.StatusUnprocessableEntity, "invalid phone number", "INVALID_PHONE")
		case errors.Is(err, service.ErrRateLimited):
			respondError(w, http.StatusTooManyRequests, "wait 60 seconds before requesting again", "RATE_LIMITED")
		default:
			slog.ErrorContext(r.Context(), "RequestOTP internal error", "err", err)
			respondError(w, http.StatusInternalServerError, "failed to send code", "INTERNAL_ERROR")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

// POST /auth/otp/verify
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10) // 1 KB

	var body otpVerifyBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Phone == "" || body.Code == "" {
		respondError(w, http.StatusBadRequest, "phone and code are required", "BAD_REQUEST")
		return
	}

	token, err := h.svc.VerifyOTP(r.Context(), body.Phone, body.Code)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidPhone):
			respondError(w, http.StatusUnprocessableEntity, "invalid phone number", "INVALID_PHONE")
		case errors.Is(err, service.ErrInvalidCode):
			respondError(w, http.StatusUnauthorized, "invalid or expired code", "INVALID_CODE")
		default:
			slog.ErrorContext(r.Context(), "VerifyOTP internal error", "err", err)
			respondError(w, http.StatusInternalServerError, "verification failed", "INTERNAL_ERROR")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"token": token})
}
