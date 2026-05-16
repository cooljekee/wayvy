package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

type ctxKey struct{}

type errResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// UserIDMiddleware reads the X-User-ID header injected by Nginx after JWT validation.
// Returns 401 JSON if the header is absent or not a valid UUID.
func UserIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("X-User-ID")
		id, err := uuid.Parse(raw)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(errResponse{Error: "unauthorized", Code: "UNAUTHORIZED"})
			return
		}
		ctx := context.WithValue(r.Context(), ctxKey{}, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserIDFromCtx returns the user UUID injected by UserIDMiddleware.
func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKey{}).(uuid.UUID)
	return id, ok
}

// MustUserIDFromCtx returns the user UUID or panics if middleware was not applied.
// Use inside handler groups protected by UserIDMiddleware — panic is caught by Recoverer.
func MustUserIDFromCtx(ctx context.Context) uuid.UUID {
	id, ok := ctx.Value(ctxKey{}).(uuid.UUID)
	if !ok {
		panic("userID missing from context — UserIDMiddleware not applied")
	}
	return id
}
