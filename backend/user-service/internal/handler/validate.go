package handler

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// TokenValidator is satisfied by AuthService.
type TokenValidator interface {
	ValidateToken(tokenString string) (uuid.UUID, error)
}

type ValidateHandler struct {
	svc TokenValidator
}

func NewValidateHandler(svc TokenValidator) *ValidateHandler {
	return &ValidateHandler{svc: svc}
}

// GET /auth/validate — internal endpoint for Nginx auth_request.
// Reads Authorization: Bearer <token>, validates JWT, sets X-User-ID response header.
// Returns 200 on valid token, 401 otherwise. No response body.
func (h *ValidateHandler) Validate(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	id, err := h.svc.ValidateToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	w.Header().Set("X-User-ID", id.String())
	w.WriteHeader(http.StatusOK)
}

