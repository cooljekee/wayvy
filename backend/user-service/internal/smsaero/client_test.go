package smsaero_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestClient(email, apiKey, baseURL string) *testClient {
	return &testClient{email: email, apiKey: apiKey, baseURL: baseURL}
}

// testClient wraps the unexported newWithBaseURL via a helper in the same package.
// Tests live in smsaero_test and call the exported New; for baseURL injection we
// use the package-internal helper exposed via export_test.go.

// export_test.go will expose newWithBaseURL as NewWithBaseURL for tests.

type testClient struct {
	email   string
	apiKey  string
	baseURL string
}

func TestSendOTP_MockServer(t *testing.T) {
	called := false
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true

		if r.URL.Path != "/sms/send" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		email, key, ok := r.BasicAuth()
		if !ok {
			t.Error("basic auth missing")
		}
		if email != "test@example.com" || key != "testkey" {
			t.Errorf("wrong auth: %s / %s", email, key)
		}

		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if strings.HasPrefix(body["number"], "+") {
			t.Errorf("number must not have +, got %q", body["number"])
		}
		if body["number"] != "79161234567" {
			t.Errorf("expected 79161234567, got %q", body["number"])
		}
		if body["text"] != "Код Wayvy: 1234" {
			t.Errorf("wrong text: %q", body["text"])
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"success": true})
	}))
	defer srv.Close()

	c := NewWithBaseURL("test@example.com", "testkey", srv.URL+"/")
	err := c.SendOTP(context.Background(), "+79161234567", "1234")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Fatal("mock server was not called")
	}
}

func TestSendOTP_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := NewWithBaseURL("e", "k", srv.URL+"/")
	if err := c.SendOTP(context.Background(), "+79161234567", "1234"); err == nil {
		t.Fatal("expected error on 500")
	}
}

func TestSendOTP_SuccessFalse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"success": false, "message": "bad number format"})
	}))
	defer srv.Close()

	c := NewWithBaseURL("e", "k", srv.URL+"/")
	err := c.SendOTP(context.Background(), "+79161234567", "1234")
	if err == nil {
		t.Fatal("expected error when success=false")
	}
	if !strings.Contains(err.Error(), "bad number format") {
		t.Fatalf("expected error message to contain rejection reason, got %v", err)
	}
}
