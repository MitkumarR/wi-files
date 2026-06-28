package search

import (
	"encoding/json"
	"log"
	"net/http"
)

var service = NewService()

// HandleSearch handles GET /api/search requests.
//
// Query parameters:
//   - q         (required) — the search term
//   - path      (optional) — root directory to search in (default: "/")
//   - recursive (optional) — "true" to walk subdirectories (default: "false")
//
// Examples:
//
//	GET /api/search?q=movie&path=/home/mit                    → flat search in /home/mit
//	GET /api/search?q=movie&path=/home/mit&recursive=true     → deep search under /home/mit
//	GET /api/search?q=movie&path=/&recursive=true             → entire filesystem
func HandleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing required parameter: q", http.StatusBadRequest)
		return
	}

	root := r.URL.Query().Get("path")
	if root == "" {
		root = "/"
	}

	recursive := r.URL.Query().Get("recursive") == "true"

	ctx := SearchContext{
		Root:      root,
		Recursive: recursive,
		Query:     query,
	}

	results, err := service.Execute(ctx)
	if err != nil {
		log.Printf("Search error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
