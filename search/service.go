package search

import (
	"fmt"
	"os"
)

// Service wraps the search engine with input validation.
type Service struct{}

// NewService creates a new search Service.
func NewService() *Service {
	return &Service{}
}

// Execute validates the SearchContext and delegates to the Search engine.
func (s *Service) Execute(ctx SearchContext) ([]SearchResult, error) {
	if ctx.Query == "" {
		return nil, fmt.Errorf("query must not be empty")
	}

	if ctx.Root == "" {
		ctx.Root = "/"
	}

	// Verify root directory exists and is accessible
	info, err := os.Stat(ctx.Root)
	if err != nil {
		return nil, fmt.Errorf("root path not accessible: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("root path is not a directory")
	}

	return Search(ctx)
}
