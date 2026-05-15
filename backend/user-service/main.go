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

	dbURL      := mustEnv("DATABASE_URL")
	redisAddr  := mustEnv("REDIS_ADDR")
	jwtSecret  := mustEnv("JWT_SECRET")
	smsEmail   := mustEnv("SMSAERO_EMAIL")
	smsKey     := mustEnv("SMSAERO_API_KEY")

	// --- migrations ---
	if err := db.RunMigrations(dbURL, migrationsFS); err != nil {
		slog.Error("migrations failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied")

	// --- DB pool ---
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		slog.Error("db pool init failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		slog.Error("db ping failed", "err", err)
		os.Exit(1)
	}

	// --- Redis ---
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	defer rdb.Close()

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		slog.Error("redis ping failed", "err", err)
		os.Exit(1)
	}

	// --- dependency graph ---
	smsClient := smsaero.New(smsEmail, smsKey)
	userStore  := store.NewUserStore(pool)
	authSvc    := service.NewAuthService(userStore, smsClient, rdb, jwtSecret)
	authH      := handler.NewAuthHandler(authSvc)

	// --- router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", handler.Health)
	r.Post("/auth/otp/request", authH.RequestOTP)
	r.Post("/auth/otp/verify",  authH.VerifyOTP)

	// --- HTTP server ---
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

	// Run server in goroutine; send error to channel so defers in main are not skipped.
	serverErr := make(chan error, 1)
	go func() {
		slog.Info("user-service starting", "port", port)
		serverErr <- srv.ListenAndServe()
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "err", err)
			os.Exit(1)
		}
	case <-quit:
		slog.Info("shutdown signal received")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "err", err)
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
