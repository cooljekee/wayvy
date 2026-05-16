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

func decodeJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
