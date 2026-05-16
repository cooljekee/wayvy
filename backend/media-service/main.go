package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/cooljekee/wayvy/media-service/internal/handler"
	"github.com/cooljekee/wayvy/media-service/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	mediaSvc, err := service.NewMediaService(
		mustEnv("R2_ENDPOINT"),
		mustEnv("R2_BUCKET"),
		mustEnv("R2_ACCESS_KEY_ID"),
		mustEnv("R2_SECRET_ACCESS_KEY"),
		mustEnv("R2_PUBLIC_URL"),
	)
	if err != nil {
		slog.Error("media service init failed", "err", err)
		os.Exit(1)
	}

	mediaH := handler.NewMediaHandler(mediaSvc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	r.Get("/health", handler.Health)
	r.Post("/media/upload", mediaH.Upload)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("media-service starting", "port", port)
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
	slog.Info("media-service stopped")
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("required env var missing", "key", key)
		os.Exit(1)
	}
	return v
}
