package monitor

import (
	"encoding/json"
	"net/http"
)

func HandleStats(w http.ResponseWriter, r *http.Request) {
	// Simple stub for system monitoring stats
	stats := map[string]string{
		"cpu": "15%",
		"ram": "4.2GB / 16GB",
		"temp": "45°C",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
