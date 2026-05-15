package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cooljekee/wayvy/user-service/internal/handler"
	"github.com/cooljekee/wayvy/user-service/internal/service"
)

type mockAuthSvc struct {
	requestErr  error
	verifyToken string
	verifyErr   error
}

func (m *mockAuthSvc) RequestOTP(_ context.Context, _ string) error { return m.requestErr }
func (m *mockAuthSvc) VerifyOTP(_ context.Context, _, _ string) (string, error) {
	return m.verifyToken, m.verifyErr
}

func postJSON(t *testing.T, h http.HandlerFunc, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h(w, req)
	return w
}

// --- RequestOTP ---

func TestRequestOTP_MissingPhone(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{})
	w := postJSON(t, h.RequestOTP, "/auth/otp/request", map[string]string{})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestRequestOTP_InvalidPhone(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{requestErr: service.ErrInvalidPhone})
	w := postJSON(t, h.RequestOTP, "/auth/otp/request", map[string]string{"phone": "bad"})
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["code"] != "INVALID_PHONE" {
		t.Fatalf("expected INVALID_PHONE code, got %q", resp["code"])
	}
}

func TestRequestOTP_RateLimited(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{requestErr: service.ErrRateLimited})
	w := postJSON(t, h.RequestOTP, "/auth/otp/request", map[string]string{"phone": "+79161234567"})
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["code"] != "RATE_LIMITED" {
		t.Fatalf("expected RATE_LIMITED, got %q", resp["code"])
	}
}

func TestRequestOTP_Success(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{})
	w := postJSON(t, h.RequestOTP, "/auth/otp/request", map[string]string{"phone": "+79161234567"})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "sent" {
		t.Fatalf("expected status=sent, got %q", resp["status"])
	}
}

// --- VerifyOTP ---

func TestVerifyOTP_MissingFields(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{})
	w := postJSON(t, h.VerifyOTP, "/auth/otp/verify", map[string]string{"phone": "+79161234567"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestVerifyOTP_InvalidCode(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{verifyErr: service.ErrInvalidCode})
	w := postJSON(t, h.VerifyOTP, "/auth/otp/verify", map[string]string{"phone": "+79161234567", "code": "0000"})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["code"] != "INVALID_CODE" {
		t.Fatalf("expected INVALID_CODE, got %q", resp["code"])
	}
}

func TestVerifyOTP_Success(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{verifyToken: "eyJhbGciOiJIUzI1NiJ9.test.sig"})
	w := postJSON(t, h.VerifyOTP, "/auth/otp/verify", map[string]string{"phone": "+79161234567", "code": "1234"})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["token"] == "" {
		t.Fatal("expected non-empty token in response")
	}
}

func TestVerifyOTP_InternalError(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{verifyErr: errInternal})
	w := postJSON(t, h.VerifyOTP, "/auth/otp/verify", map[string]string{"phone": "+79161234567", "code": "1234"})
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["code"] != "INTERNAL_ERROR" {
		t.Fatalf("expected INTERNAL_ERROR, got %q", resp["code"])
	}
}

// sentinel for non-domain errors
var errInternal = bytes.ErrTooLarge
