package handler

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

const maxUploadBytes = 10 << 20 // 10 MB

type Uploader interface {
	Upload(ctx context.Context, data []byte) (r2Key, publicURL string, err error)
}

type MediaHandler struct {
	svc Uploader
}

func NewMediaHandler(svc Uploader) *MediaHandler {
	return &MediaHandler{svc: svc}
}

// POST /media/upload — multipart/form-data, field "file"
func (h *MediaHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)

	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		respondError(w, http.StatusBadRequest, "invalid multipart form or file too large", "BAD_REQUEST")
		return
	}
	defer r.MultipartForm.RemoveAll()

	file, _, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "field 'file' missing", "BAD_REQUEST")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUploadBytes))
	if err != nil {
		respondError(w, http.StatusBadRequest, "could not read file", "BAD_REQUEST")
		return
	}

	mimeType := http.DetectContentType(data)
	if !strings.HasPrefix(mimeType, "image/") {
		respondError(w, http.StatusUnprocessableEntity, "file must be an image", "VALIDATION_ERROR")
		return
	}

	r2Key, url, err := h.svc.Upload(r.Context(), data)
	if err != nil {
		slog.ErrorContext(r.Context(), "Upload failed", "err", err)
		respondError(w, http.StatusInternalServerError, "upload failed", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{
		"r2_key": r2Key,
		"url":    url,
	})
}
