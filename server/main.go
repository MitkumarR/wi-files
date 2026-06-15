package main

import (
	"log"
	"net/http"
	"strings"

	"wifiles-server/auth"
	"wifiles-server/database"
	"wifiles-server/drives"
	"wifiles-server/files"
	"wifiles-server/monitor"

	"github.com/golang-jwt/jwt/v5"
)

// ... (middlewares)

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func securityMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Path traversal & restricted directories check
		pathParam := r.URL.Query().Get("path")
		if pathParam != "" {
			if strings.Contains(pathParam, "..") {
				http.Error(w, "Path traversal detected", http.StatusForbidden)
				return
			}
			restricted := []string{"/proc", "/sys", "/dev", "/run"}
			for _, prefix := range restricted {
				if strings.HasPrefix(pathParam, prefix) && !strings.HasPrefix(pathParam, "/run/media") {
					http.Error(w, "Access to restricted directory denied", http.StatusForbidden)
					return
				}
			}
		}

		// 2. JWT Verification (skip for login)
		if r.URL.Path == "/api/auth/login" {
			next(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		
		// For video streaming, <video> tag can't send Authorization header easily
		if tokenString == "" {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			http.Error(w, "Missing or invalid token", http.StatusUnauthorized)
			return
		}
		claims := &auth.Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return auth.JwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// All good
		next(w, r)
	}
}

func main() {
	database.InitDB()

	// Start the background filesystem scanner on target directories
	drives.StartBackgroundScan([]string{"/home", "/media", "/mnt"})

	// Wrap handlers in security and cors middlewares
	// corsMiddleware should be outermost so CORS headers are added even on 401/403
	http.HandleFunc("/api/files", corsMiddleware(securityMiddleware(files.HandleFiles)))
	http.HandleFunc("/api/download", corsMiddleware(securityMiddleware(files.HandleDownload)))
	http.HandleFunc("/api/thumbnail", corsMiddleware(securityMiddleware(files.HandleThumbnail)))
	http.HandleFunc("/api/upload", corsMiddleware(securityMiddleware(files.HandleUpload)))
	http.HandleFunc("/api/drives", corsMiddleware(securityMiddleware(drives.HandleDrives)))
	http.HandleFunc("/api/monitor", corsMiddleware(securityMiddleware(monitor.HandleStats)))
	http.HandleFunc("/api/auth/login", corsMiddleware(securityMiddleware(auth.HandleLogin)))

	log.Println("Wi-File Backend running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}