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

type mockSMS struct {
	called bool
	err    error
}

func (m *mockSMS) SendOTP(_ context.Context, _, _ string) error {
	m.called = true
	return m.err
}

type mockStore struct {
	id  uuid.UUID
	err error
}

func (m *mockStore) FindOrCreateByPhone(_ context.Context, _ string) (uuid.UUID, error) {
	return m.id, m.err
}

// newTestRedis returns a Redis client on DB 15 (test DB) and skips if unavailable.
func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		t.Skip("Redis not available:", err)
	}
	t.Cleanup(func() {
		rdb.FlushDB(context.Background())
		rdb.Close()
	})
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
	svc := service.NewAuthService(&mockStore{id: uuid.New()}, sms, rdb, "secret32charsminimum____________")

	phone := "+79161234567"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("first RequestOTP failed: %v", err)
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

func TestVerifyOTP_WrongCode(t *testing.T) {
	rdb := newTestRedis(t)
	sms := &mockSMS{}
	svc := service.NewAuthService(&mockStore{id: uuid.New()}, sms, rdb, "secret32charsminimum____________")

	phone := "+79161234567"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("RequestOTP failed: %v", err)
	}
	_, err := svc.VerifyOTP(context.Background(), phone, "0000")
	if !errors.Is(err, service.ErrInvalidCode) {
		t.Fatalf("expected ErrInvalidCode for wrong code, got %v", err)
	}
}

func TestVerifyOTP_HappyPath(t *testing.T) {
	rdb := newTestRedis(t)
	sms := &mockSMS{}
	id := uuid.New()
	svc := service.NewAuthService(&mockStore{id: id}, sms, rdb, "secret32charsminimum____________")

	phone := "+79161234567"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("RequestOTP failed: %v", err)
	}

	// fetch code from Redis directly (test only)
	code, err := rdb.Get(context.Background(), "otp:"+phone).Result()
	if err != nil {
		t.Fatalf("get otp from redis: %v", err)
	}

	token, err := svc.VerifyOTP(context.Background(), phone, code)
	if err != nil {
		t.Fatalf("VerifyOTP failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty JWT token")
	}

	// OTP должен быть удалён — повторный verify должен вернуть ErrInvalidCode
	_, err = svc.VerifyOTP(context.Background(), phone, code)
	if !errors.Is(err, service.ErrInvalidCode) {
		t.Fatalf("expected ErrInvalidCode on reuse, got %v", err)
	}
}

func TestVerifyOTP_OTPDeletedAfterSuccess(t *testing.T) {
	rdb := newTestRedis(t)
	sms := &mockSMS{}
	svc := service.NewAuthService(&mockStore{id: uuid.New()}, sms, rdb, "secret32charsminimum____________")

	phone := "+79991112233"
	if err := svc.RequestOTP(context.Background(), phone); err != nil {
		t.Fatalf("RequestOTP: %v", err)
	}
	code, _ := rdb.Get(context.Background(), "otp:"+phone).Result()

	if _, err := svc.VerifyOTP(context.Background(), phone, code); err != nil {
		t.Fatalf("VerifyOTP: %v", err)
	}

	// key должен исчезнуть из Redis
	exists, _ := rdb.Exists(context.Background(), "otp:"+phone).Result()
	if exists != 0 {
		t.Fatal("OTP key should be deleted after successful verify")
	}
}
