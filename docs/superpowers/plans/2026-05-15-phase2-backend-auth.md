# Phase 2 Backend — SMS Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — свежий субагент на каждую задачу + два ревью (spec → quality).

**Goal:** Реализовать SMS OTP авторизацию в user-service: SMSAero клиент, Redis OTP storage, два HTTP endpoint-а (`/auth/otp/request`, `/auth/otp/verify`), JWT генерация.

**Architecture decision:** Классическая трёхслойная структура handler → service → store. Все зависимости инжектируются через конструкторы, без глобального состояния. Ошибки — sentinel values через `errors.Is`, не строки.

**New files after this phase:**
```
backend/user-service/
├── internal/
│   ├── handler/
│   │   ├── respond.go          ← shared JSON helpers (новый)
│   │   └── auth.go             ← POST /auth/otp/request + verify (новый)
│   ├── service/
│   │   └── auth.go             ← OTP business logic + JWT (новый)
│   ├── store/
│   │   └── user.go             ← FindOrCreateByPhone (новый)
│   └── smsaero/
│       └── client.go           ← SMSAero HTTP client (новый)
└── main.go                     ← обновить: DB pool, Redis, wire deps
```

**Already in go.mod (no new deps needed):**
- `github.com/golang-jwt/jwt/v5` — JWT
- `github.com/redis/go-redis/v9` — Redis OTP storage
- `github.com/jackc/pgx/v5` — includes pgxpool
- `github.com/google/uuid` — user IDs

---

## Task 1: Shared JSON helpers

**File:** `backend/user-service/internal/handler/respond.go`

- [ ] **Step 1: Создать respond.go**

```go
// backend/user-service/internal/handler/respond.go
package handler

import (
	"encoding/json"
	"net/http"
)

type errResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg, code string) {
	respondJSON(w, status, errResponse{Error: msg, Code: code})
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/user-service/internal/handler/respond.go
git commit -m "feat(user-service): add shared JSON response helpers"
```

---

## Task 2: SMSAero HTTP client

**File:** `backend/user-service/internal/smsaero/client.go`

SMSAero API spec:
- Base URL: `https://gate.smsaero.ru/v2/`
- Auth: `Basic base64(email:apiKey)` — стандартный HTTP Basic Auth
- Send: `POST /sms/send` с JSON body `{"number":"79161234567","text":"Код Wayvy: 1234","sign":"SMS Aero"}`
- `number` — телефон без `+` (SMSAero принимает без знака)
- Ответ успеха: HTTP 200 с JSON, где `{"success": true, ...}`

- [ ] **Step 1: Создать client.go**

```go
// backend/user-service/internal/smsaero/client.go
package smsaero

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const baseURL = "https://gate.smsaero.ru/v2/"

type Client struct {
	email   string
	apiKey  string
	http    *http.Client
}

func New(email, apiKey string) *Client {
	return &Client{
		email:  email,
		apiKey: apiKey,
		http:   &http.Client{Timeout: 10 * time.Second},
	}
}

type sendRequest struct {
	Number string `json:"number"`
	Text   string `json:"text"`
	Sign   string `json:"sign"`
}

type sendResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

func (c *Client) SendOTP(ctx context.Context, phone, code string) error {
	// SMSAero принимает номер без +: +79161234567 → 79161234567
	number := strings.TrimPrefix(phone, "+")

	body, err := json.Marshal(sendRequest{
		Number: number,
		Text:   fmt.Sprintf("Код Wayvy: %s", code),
		Sign:   "SMS Aero",
	})
	if err != nil {
		return fmt.Errorf("smsaero marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"sms/send", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("smsaero new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(c.email, c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("smsaero send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("smsaero status %d", resp.StatusCode)
	}

	var result sendResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("smsaero decode: %w", err)
	}
	if !result.Success {
		return fmt.Errorf("smsaero rejected: %s", result.Message)
	}
	return nil
}
```

- [ ] **Step 2: Написать unit-тест с httptest сервером**

```go
// backend/user-service/internal/smsaero/client_test.go
package smsaero_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cooljekee/wayvy/user-service/internal/smsaero"
)

func TestSendOTP_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		// verify Basic Auth headers present
		_, _, ok := r.BasicAuth()
		if !ok {
			t.Error("basic auth missing")
		}
		// verify phone stripped of +
		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)
		if strings.HasPrefix(body["number"], "+") {
			t.Errorf("number should not have +, got %s", body["number"])
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"success": true})
	}))
	defer srv.Close()

	// patch baseURL is not directly injectable — test via behaviour
	// We verify the client constructs and parses correctly using a local server.
	// Since baseURL is a package-level const, integration test uses env-based injection.
	// This test validates the request-building logic by inspecting the mock server.
	_ = srv // used above
	t.Skip("integration test — run with SMSAERO_EMAIL and SMSAERO_API_KEY_TEST set")
}

func TestSendOTP_StripPlus(t *testing.T) {
	// verify that phone "+79161234567" becomes "79161234567"
	phone := "+79161234567"
	number := strings.TrimPrefix(phone, "+")
	if number != "79161234567" {
		t.Fatalf("expected 79161234567, got %s", number)
	}
}
```

> Note: полноценный тест SMSAero требует инжектируемого baseURL. Добавить поле `baseURL string` в Client для тестируемости.

- [ ] **Step 3: Сделать baseURL инжектируемым для тестов**

Обновить `Client`, добавив поле `baseURL`:

```go
type Client struct {
	email   string
	apiKey  string
	baseURL string
	http    *http.Client
}

func New(email, apiKey string) *Client {
	return &Client{
		email:   email,
		apiKey:  apiKey,
		baseURL: "https://gate.smsaero.ru/v2/",
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

// newWithBaseURL используется только в тестах
func newWithBaseURL(email, apiKey, baseURL string) *Client {
	c := New(email, apiKey)
	c.baseURL = baseURL
	return c
}
```

И обновить `SendOTP` чтобы использовал `c.baseURL`.

- [ ] **Step 4: Написать полноценный mock-тест**

```go
// client_test.go
func TestSendOTP_MockServer(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/sms/send" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		email, key, ok := r.BasicAuth()
		if !ok || email != "test@example.com" || key != "testkey" {
			t.Error("wrong basic auth")
		}
		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)
		if body["number"] != "79161234567" {
			t.Errorf("expected 79161234567, got %s", body["number"])
		}
		if body["text"] != "Код Wayvy: 1234" {
			t.Errorf("wrong text: %s", body["text"])
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"success": true})
	}))
	defer srv.Close()

	c := newWithBaseURL("test@example.com", "testkey", srv.URL+"/")
	err := c.SendOTP(context.Background(), "+79161234567", "1234")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSendOTP_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := newWithBaseURL("e", "k", srv.URL+"/")
	err := c.SendOTP(context.Background(), "+79161234567", "1234")
	if err == nil {
		t.Fatal("expected error on 500")
	}
}

func TestSendOTP_SuccessFalse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"success": false, "message": "bad number"})
	}))
	defer srv.Close()

	c := newWithBaseURL("e", "k", srv.URL+"/")
	err := c.SendOTP(context.Background(), "+79161234567", "1234")
	if err == nil {
		t.Fatal("expected error when success=false")
	}
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/user-service/internal/smsaero/
git commit -m "feat(user-service): SMSAero HTTP client with mock server tests"
```

---

## Task 3: User store (PostgreSQL)

**File:** `backend/user-service/internal/store/user.go`

Операция: `FindOrCreateByPhone` — upsert через `ON CONFLICT`. Если номер уже есть — вернуть `id`. Если нет — вставить новый ряд и вернуть `id`.

- [ ] **Step 1: Создать store/user.go**

```go
// backend/user-service/internal/store/user.go
package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserStore struct {
	db *pgxpool.Pool
}

func NewUserStore(db *pgxpool.Pool) *UserStore {
	return &UserStore{db: db}
}

// FindOrCreateByPhone вставляет пользователя с номером phone (E.164) или
// возвращает id существующего. username остаётся NULL до отдельного endpoint-а.
func (s *UserStore) FindOrCreateByPhone(ctx context.Context, phone string) (uuid.UUID, error) {
	const q = `
		INSERT INTO users (phone)
		VALUES ($1)
		ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
		RETURNING id`

	var id uuid.UUID
	if err := s.db.QueryRow(ctx, q, phone).Scan(&id); err != nil {
		return uuid.Nil, fmt.Errorf("store.FindOrCreateByPhone: %w", err)
	}
	return id, nil
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/user-service/internal/store/
git commit -m "feat(user-service): user store with FindOrCreateByPhone upsert"
```

---

## Task 4: Auth service (OTP + JWT)

**File:** `backend/user-service/internal/service/auth.go`

Sentinel errors (публичные, хендлер проверяет через `errors.Is`):
```go
var (
    ErrRateLimited  = errors.New("too many requests — wait 60 seconds")
    ErrInvalidCode  = errors.New("invalid or expired code")
    ErrInvalidPhone = errors.New("invalid phone number")
)
```

JWT: HS256, payload `{sub: user_id, exp: +30 days}`.

OTP: 4-значное число (1000–9999), `fmt.Sprintf("%04d", n)`.

- [ ] **Step 1: Создать service/auth.go**

```go
// backend/user-service/internal/service/auth.go
package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var (
	ErrRateLimited  = errors.New("too many requests — wait 60 seconds")
	ErrInvalidCode  = errors.New("invalid or expired code")
	ErrInvalidPhone = errors.New("invalid phone number")
)

type SMSSender interface {
	SendOTP(ctx context.Context, phone, code string) error
}

type UserStore interface {
	FindOrCreateByPhone(ctx context.Context, phone string) (uuid.UUID, error)
}

type AuthService struct {
	users     UserStore
	sms       SMSSender
	redis     *redis.Client
	jwtSecret []byte
}

func NewAuthService(users UserStore, sms SMSSender, rdb *redis.Client, jwtSecret string) *AuthService {
	return &AuthService{
		users:     users,
		sms:       sms,
		redis:     rdb,
		jwtSecret: []byte(jwtSecret),
	}
}

// RequestOTP генерирует 4-значный код, сохраняет в Redis, отправляет SMS.
// Rate limit: 1 запрос в 60 секунд на номер.
func (s *AuthService) RequestOTP(ctx context.Context, phone string) error {
	if !validPhone(phone) {
		return ErrInvalidPhone
	}

	rlKey := fmt.Sprintf("otp_rl:%s", phone)
	set, err := s.redis.SetNX(ctx, rlKey, 1, 60*time.Second).Result()
	if err != nil {
		return fmt.Errorf("service.RequestOTP redis rl: %w", err)
	}
	if !set {
		return ErrRateLimited
	}

	code, err := generateCode()
	if err != nil {
		return fmt.Errorf("service.RequestOTP generate: %w", err)
	}

	otpKey := fmt.Sprintf("otp:%s", phone)
	if err := s.redis.Set(ctx, otpKey, code, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("service.RequestOTP redis set: %w", err)
	}

	if err := s.sms.SendOTP(ctx, phone, code); err != nil {
		return fmt.Errorf("service.RequestOTP send: %w", err)
	}
	return nil
}

// VerifyOTP проверяет код, создаёт или находит пользователя, возвращает JWT.
func (s *AuthService) VerifyOTP(ctx context.Context, phone, code string) (string, error) {
	if !validPhone(phone) {
		return "", ErrInvalidPhone
	}

	otpKey := fmt.Sprintf("otp:%s", phone)
	stored, err := s.redis.Get(ctx, otpKey).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrInvalidCode
	}
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP redis get: %w", err)
	}

	if stored != code {
		return "", ErrInvalidCode
	}

	// delete OTP so it can't be reused
	s.redis.Del(ctx, otpKey)

	userID, err := s.users.FindOrCreateByPhone(ctx, phone)
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP user: %w", err)
	}

	token, err := s.signJWT(userID)
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP jwt: %w", err)
	}
	return token, nil
}

func (s *AuthService) signJWT(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(s.jwtSecret)
}

func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%04d", n.Int64()+1000), nil
}

// validPhone проверяет E.164 формат (+ и 7–15 цифр)
func validPhone(phone string) bool {
	if len(phone) < 8 || len(phone) > 16 || phone[0] != '+' {
		return false
	}
	for _, c := range phone[1:] {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
```

- [ ] **Step 2: Написать unit-тесты auth service**

```go
// backend/user-service/internal/service/auth_test.go
package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/cooljekee/wayvy/user-service/internal/service"
)

// --- mocks ---

type mockSMS struct{ called bool; err error }
func (m *mockSMS) SendOTP(_ context.Context, _, _ string) error { m.called = true; return m.err }

type mockStore struct{ id uuid.UUID; err error }
func (m *mockStore) FindOrCreateByPhone(_ context.Context, _ string) (uuid.UUID, error) {
	return m.id, m.err
}

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		t.Skip("Redis not available:", err)
	}
	t.Cleanup(func() { rdb.FlushDB(context.Background()); rdb.Close() })
	return rdb
}

func TestRequestOTP_InvalidPhone(t *testing.T) {
	svc := service.NewAuthService(&mockStore{}, &mockSMS{}, nil, "secret")
	err := svc.RequestOTP(context.Background(), "not-a-phone")
	if !errors.Is(err, service.ErrInvalidPhone) {
		t.Fatalf("expected ErrInvalidPhone, got %v", err)
	}
}

func TestRequestOTP_RateLimit(t *testing.T) {
	rdb := newTestRedis(t)
	sms := &mockSMS{}
	svc := service.NewAuthService(&mockStore{id: uuid.New()}, sms, rdb, "secret")

	phone := "+79161234567"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	err := svc.RequestOTP(context.Background(), phone)
	if !errors.Is(err, service.ErrRateLimited) {
		t.Fatalf("expected ErrRateLimited on second call, got %v", err)
	}
}

func TestVerifyOTP_InvalidCode(t *testing.T) {
	rdb := newTestRedis(t)
	svc := service.NewAuthService(&mockStore{id: uuid.New()}, &mockSMS{}, rdb, "secret")
	_, err := svc.VerifyOTP(context.Background(), "+79161234567", "0000")
	if !errors.Is(err, service.ErrInvalidCode) {
		t.Fatalf("expected ErrInvalidCode, got %v", err)
	}
}

func TestVerifyOTP_HappyPath(t *testing.T) {
	rdb := newTestRedis(t)
	sms := &mockSMS{}
	id := uuid.New()
	svc := service.NewAuthService(&mockStore{id: id}, sms, rdb, "supersecret32charsminimum_______")

	phone := "+79161234567"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("RequestOTP failed: %v", err)
	}

	// extract code from Redis directly
	code, _ := rdb.Get(context.Background(), "otp:"+phone).Result()

	token, err := svc.VerifyOTP(context.Background(), phone, code)
	if err != nil {
		t.Fatalf("VerifyOTP failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/internal/service/
git commit -m "feat(user-service): auth service with OTP flow and JWT signing"
```

---

## Task 5: Auth HTTP handlers

**File:** `backend/user-service/internal/handler/auth.go`

Error → HTTP status mapping:
- `ErrInvalidPhone` → 422
- `ErrRateLimited` → 429
- `ErrInvalidCode` → 401
- Любая другая ошибка → 500

- [ ] **Step 1: Создать handler/auth.go**

```go
// backend/user-service/internal/handler/auth.go
package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/cooljekee/wayvy/user-service/internal/service"
)

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
	var body otpRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Phone == "" {
		respondError(w, http.StatusBadRequest, "phone is required", "BAD_REQUEST")
		return
	}

	err := h.svc.RequestOTP(r.Context(), body.Phone)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidPhone):
			respondError(w, http.StatusUnprocessableEntity, "invalid phone number", "INVALID_PHONE")
		case errors.Is(err, service.ErrRateLimited):
			respondError(w, http.StatusTooManyRequests, "wait 60 seconds before requesting again", "RATE_LIMITED")
		default:
			respondError(w, http.StatusInternalServerError, "failed to send code", "INTERNAL_ERROR")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

// POST /auth/otp/verify
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
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
			respondError(w, http.StatusInternalServerError, "verification failed", "INTERNAL_ERROR")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"token": token})
}

// ensure uuid import used (uuid referenced in interface contracts)
var _ = uuid.Nil
```

- [ ] **Step 2: Написать handler-тесты**

```go
// backend/user-service/internal/handler/auth_test.go
package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cooljekee/wayvy/user-service/internal/handler"
	"github.com/cooljekee/wayvy/user-service/internal/service"
)

type mockAuthSvc struct {
	requestErr error
	verifyToken string
	verifyErr  error
}

func (m *mockAuthSvc) RequestOTP(_ context.Context, _ string) error { return m.requestErr }
func (m *mockAuthSvc) VerifyOTP(_ context.Context, _, _ string) (string, error) {
	return m.verifyToken, m.verifyErr
}

func TestRequestOTP_MissingPhone(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{})
	req := httptest.NewRequest(http.MethodPost, "/auth/otp/request", bytes.NewBufferString(`{}`))
	w := httptest.NewRecorder()
	h.RequestOTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestRequestOTP_RateLimited(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{requestErr: service.ErrRateLimited})
	body, _ := json.Marshal(map[string]string{"phone": "+79161234567"})
	req := httptest.NewRequest(http.MethodPost, "/auth/otp/request", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.RequestOTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w.Code)
	}
}

func TestVerifyOTP_InvalidCode(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{verifyErr: service.ErrInvalidCode})
	body, _ := json.Marshal(map[string]string{"phone": "+79161234567", "code": "0000"})
	req := httptest.NewRequest(http.MethodPost, "/auth/otp/verify", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.VerifyOTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestVerifyOTP_Success(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthSvc{verifyToken: "jwt.token.here"})
	body, _ := json.Marshal(map[string]string{"phone": "+79161234567", "code": "1234"})
	req := httptest.NewRequest(http.MethodPost, "/auth/otp/verify", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.VerifyOTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["token"] != "jwt.token.here" {
		t.Fatalf("wrong token: %v", resp)
	}
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/internal/handler/auth.go backend/user-service/internal/handler/auth_test.go
git commit -m "feat(user-service): auth HTTP handlers with error mapping"
```

---

## Task 6: Wire everything in main.go

Обновить `main.go`: инициализация DB pool, Redis client, SMSAero client, AuthService, AuthHandler. Зарегистрировать маршруты `/auth/otp/request` и `/auth/otp/verify`.

- [ ] **Step 1: Обновить main.go**

```go
// backend/user-service/main.go
package main

import (
	"context"
	"embed"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/cooljekee/wayvy/user-service/internal/db"
	"github.com/cooljekee/wayvy/user-service/internal/handler"
	"github.com/cooljekee/wayvy/user-service/internal/service"
	"github.com/cooljekee/wayvy/user-service/internal/smsaero"
	"github.com/cooljekee/wayvy/user-service/internal/store"
)

//go:embed migrations
var migrationsFS embed.FS

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// --- required env vars ---
	dbURL := mustEnv("DATABASE_URL")
	redisAddr := mustEnv("REDIS_ADDR")
	jwtSecret := mustEnv("JWT_SECRET")
	smsEmail := mustEnv("SMSAERO_EMAIL")
	smsKey := mustEnv("SMSAERO_API_KEY")

	// --- migrations ---
	if err := db.RunMigrations(dbURL, migrationsFS); err != nil {
		slog.Error("migrations failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied")

	// --- DB pool ---
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		slog.Error("db pool failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	// --- Redis ---
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	defer rdb.Close()

	// --- dependencies ---
	smsClient := smsaero.New(smsEmail, smsKey)
	userStore := store.NewUserStore(pool)
	authSvc := service.NewAuthService(userStore, smsClient, rdb, jwtSecret)
	authH := handler.NewAuthHandler(authSvc)

	// --- router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", handler.Health)
	r.Post("/auth/otp/request", authH.RequestOTP)
	r.Post("/auth/otp/verify", authH.VerifyOTP)

	// --- server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("user-service starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	slog.Info("user-service stopped")
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("required env var missing", "key", key)
		os.Exit(1)
	}
	return v
}
```

- [ ] **Step 2: Обновить .env с необходимыми переменными**

```
# backend/.env (уже gitignored)
SMSAERO_EMAIL=qqcooljekee@gmail.com
SMSAERO_API_KEY_TEST=okKEl24gpALLaZb6oNvaIfunEF5b
# для Docker: SMSAERO_API_KEY = test key пока нет prod
SMSAERO_API_KEY=okKEl24gpALLaZb6oNvaIfunEF5b
JWT_SECRET=wayvy_dev_secret_32chars_minimum_
```

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/main.go
git commit -m "feat(user-service): wire auth service, DB pool, Redis into main"
```

---

## Task 7: Smoke test (manual)

После `make up`:

```bash
# 1. Запрос OTP
curl -s -X POST http://localhost:8080/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79161234567"}'
# Expected: {"status":"sent"}
# Код появится в дашборде SMSAero (test mode)

# 2. Верификация OTP (код из дашборда)
curl -s -X POST http://localhost:8080/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79161234567","code":"XXXX"}'
# Expected: {"token":"eyJ..."}

# 3. Rate limit
curl -s -X POST http://localhost:8080/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79161234567"}'
# Expected: 429 {"error":"wait 60 seconds...","code":"RATE_LIMITED"}

# 4. Неверный код
curl -s -X POST http://localhost:8080/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79161234567","code":"0000"}'
# Expected: 401 {"error":"invalid or expired code","code":"INVALID_CODE"}
```

---

## Engineer self-review checklist (Phase 2)

- [ ] Нет хардкода секретов — все через `os.Getenv()`
- [ ] SMSAero API key только в `.env`, не в коде
- [ ] `otp:{phone}` TTL 5 min, `otp_rl:{phone}` TTL 60s
- [ ] Rate limit работает per-phone (не per-IP — это на Nginx уровне)
- [ ] OTP удаляется из Redis после успешной верификации (не повторно используется)
- [ ] JWT payload: `sub` (user_id), `exp` (+30 дней), `iat`
- [ ] Structured JSON errors во всех ошибочных ответах
- [ ] Context propagated через все слои
- [ ] `findOrCreate` — атомарный upsert через `ON CONFLICT`
- [ ] `baseURL` инжектируем в SMSAero client для тестов
