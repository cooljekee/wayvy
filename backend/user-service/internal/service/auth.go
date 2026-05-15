package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
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
	if len(jwtSecret) < 32 {
		panic("jwtSecret must be at least 32 bytes for HS256")
	}
	return &AuthService{
		users:     users,
		sms:       sms,
		redis:     rdb,
		jwtSecret: []byte(jwtSecret),
	}
}

// RequestOTP генерирует 4-значный код, сохраняет в Redis TTL 5 мин, отправляет SMS.
// Rate limit: 1 запрос в 60 секунд на номер (key otp_rl:{phone}).
// Если SMS не отправился — OTP и RL ключи удаляются, пользователь может повторить.
func (s *AuthService) RequestOTP(ctx context.Context, phone string) error {
	if !validPhone(phone) {
		return ErrInvalidPhone
	}

	rlKey := "otp_rl:" + phone
	set, err := s.redis.SetNX(ctx, rlKey, 1, 60*time.Second).Result()
	if err != nil {
		return fmt.Errorf("service.RequestOTP rate-limit check: %w", err)
	}
	if !set {
		return ErrRateLimited
	}

	code, err := generateCode()
	if err != nil {
		s.redis.Del(ctx, rlKey)
		return fmt.Errorf("service.RequestOTP generate code: %w", err)
	}

	otpKey := "otp:" + phone
	if err := s.redis.Set(ctx, otpKey, code, 5*time.Minute).Err(); err != nil {
		s.redis.Del(ctx, rlKey)
		return fmt.Errorf("service.RequestOTP store otp: %w", err)
	}

	if err := s.sms.SendOTP(ctx, phone, code); err != nil {
		// rollback: allow immediate retry
		s.redis.Del(ctx, otpKey)
		s.redis.Del(ctx, rlKey)
		return fmt.Errorf("service.RequestOTP send sms: %w", err)
	}
	return nil
}

// VerifyOTP проверяет код, удаляет его из Redis (одноразовый), создаёт/находит пользователя, возвращает JWT.
func (s *AuthService) VerifyOTP(ctx context.Context, phone, code string) (string, error) {
	if !validPhone(phone) {
		return "", ErrInvalidPhone
	}

	otpKey := "otp:" + phone
	stored, err := s.redis.Get(ctx, otpKey).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrInvalidCode
	}
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP get otp: %w", err)
	}

	// constant-time compare — защита от timing attack
	if subtle.ConstantTimeCompare([]byte(stored), []byte(code)) != 1 {
		return "", ErrInvalidCode
	}

	// удаляем OTP до создания пользователя — если Del упадёт, не выдаём токен
	if err := s.redis.Del(ctx, otpKey).Err(); err != nil {
		return "", fmt.Errorf("service.VerifyOTP del otp: %w", err)
	}

	userID, err := s.users.FindOrCreateByPhone(ctx, phone)
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP find user: %w", err)
	}

	token, err := s.signJWT(userID)
	if err != nil {
		return "", fmt.Errorf("service.VerifyOTP sign jwt: %w", err)
	}
	return token, nil
}

func (s *AuthService) signJWT(userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": now.Add(30 * 24 * time.Hour).Unix(),
		"iat": now.Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(s.jwtSecret)
}

// generateCode возвращает криптографически случайный 4-значный код (1000–9999).
func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "", fmt.Errorf("generateCode: %w", err)
	}
	return fmt.Sprintf("%04d", n.Int64()+1000), nil
}

// validPhone проверяет E.164: + и 7–15 цифр (итого 8–16 символов).
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
