package auth

import (
	"encoding/json"
	"net/http"
)

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": "stub-jwt-token",
		"role":  "admin",
	})
}
