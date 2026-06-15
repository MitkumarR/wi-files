package main

import (
	"log"
	"net/http"

	"wifiles-server/auth"
	"wifiles-server/drives"
	"wifiles-server/files"
	"wifiles-server/monitor"
)

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

func main() {
	http.HandleFunc("/api/files", corsMiddleware(files.HandleFiles))
	http.HandleFunc("/api/drives", corsMiddleware(drives.HandleDrives))
	http.HandleFunc("/api/monitor", corsMiddleware(monitor.HandleStats))
	http.HandleFunc("/api/auth/login", corsMiddleware(auth.HandleLogin))

	log.Println("Wi-File Backend running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}