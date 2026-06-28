package search

import (
	"os"
	"path/filepath"
	"strings"
)

// Search performs a filesystem search based on the given SearchContext.
//
// Behavior mirrors GNOME Files:
//   - Recursive=false → only checks immediate children of Root (current folder search)
//   - Recursive=true  → walks the entire subtree under Root (deep search / "Search Here")
//   - Root="/" + Recursive=true → full filesystem search
//
// The query match is case-insensitive substring against the file/directory name.
// Hidden directories (e.g. .git, .cache) are skipped during recursive walks
// to avoid noise and improve performance.
func Search(ctx SearchContext) ([]SearchResult, error) {
	ctx.Query = strings.ToLower(ctx.Query)

	if !ctx.Recursive {
		return searchFlat(ctx)
	}
	return searchRecursive(ctx)
}

// searchFlat reads a single directory and returns entries whose names match the query.
func searchFlat(ctx SearchContext) ([]SearchResult, error) {
	entries, err := os.ReadDir(ctx.Root)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	for _, entry := range entries {
		if !strings.Contains(strings.ToLower(entry.Name()), ctx.Query) {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		results = append(results, SearchResult{
			Name:    entry.Name(),
			Path:    filepath.Join(ctx.Root, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
		})
	}

	if results == nil {
		results = make([]SearchResult, 0)
	}
	return results, nil
}

// searchRecursive walks the directory tree under Root and collects all matches.
// It caps results at maxResults to prevent excessively large responses.
func searchRecursive(ctx SearchContext) ([]SearchResult, error) {
	const maxResults = 500

	var results []SearchResult

	err := filepath.WalkDir(ctx.Root, func(path string, d os.DirEntry, err error) error {
		// Skip directories we can't read (permission denied, etc.)
		if err != nil {
			return filepath.SkipDir
		}

		// Skip common hidden/system directories to keep results relevant and fast
		if d.IsDir() && path != ctx.Root {
			name := d.Name()
			if strings.HasPrefix(name, ".") || name == "node_modules" || name == "__pycache__" {
				return filepath.SkipDir
			}
		}

		// Check name match
		if strings.Contains(strings.ToLower(d.Name()), ctx.Query) {
			info, infoErr := d.Info()
			if infoErr != nil {
				return nil // skip this entry but continue walking
			}
			results = append(results, SearchResult{
				Name:    d.Name(),
				Path:    path,
				IsDir:   d.IsDir(),
				Size:    info.Size(),
				ModTime: info.ModTime(),
			})

			if len(results) >= maxResults {
				return filepath.SkipAll
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	if results == nil {
		results = make([]SearchResult, 0)
	}
	return results, nil
}
