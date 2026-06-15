package files

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
)

type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size"`
}

func HandleFiles(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		http.Error(w, "Failed to read directory", http.StatusInternalServerError)
		return
	}

	var files []FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		size := int64(0)
		if err == nil {
			size = info.Size()
		}
		files = append(files, FileInfo{
			Name:  entry.Name(),
			Path:  filepath.Join(path, entry.Name()),
			IsDir: entry.IsDir(),
			Size:  size,
		})
	}

	if files == nil {
		files = make([]FileInfo, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}
