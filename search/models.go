package search

import "time"

// SearchContext holds the parameters for a search operation,
// mirroring GNOME Files' search modes (current folder, recursive, entire FS).
type SearchContext struct {
	Root      string `json:"root"`      // Directory to start searching from
	Recursive bool   `json:"recursive"` // false = current folder only, true = walk subdirectories
	Query     string `json:"query"`     // Search term (case-insensitive substring match)
}

// SearchResult represents a single file/directory that matched the query.
type SearchResult struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	IsDir   bool      `json:"isDir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
}
