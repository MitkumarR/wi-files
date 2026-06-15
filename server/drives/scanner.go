package drives

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"wifiles-server/database"
)

func StartBackgroundScan(targets []string) {
	go func() {
		// Wait a few seconds before starting the first scan to allow server to boot up
		time.Sleep(5 * time.Second)
		
		for {
			log.Println("Starting background filesystem scan...")
			
			for _, target := range targets {
				log.Printf("Scanning target: %s\n", target)
				scanDirectory(target)
			}
			
			log.Println("Background scan cycle completed. Sleeping for 60 minutes...")
			time.Sleep(60 * time.Minute)
		}
	}()
}

func scanDirectory(root string) {
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// Permission denied or other error, skip it gracefully
			if info != nil && info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Only index files, not directories
		if info.IsDir() {
			return nil
		}

		// Use INSERT OR REPLACE to upsert based on the unique path index
		query := `
		INSERT OR REPLACE INTO files_index (path, filename, size, modified_date) 
		VALUES (?, ?, ?, ?)`
		
		_, dbErr := database.DB.Exec(query, path, info.Name(), info.Size(), info.ModTime())
		if dbErr != nil {
			log.Printf("Failed to index file %s: %v\n", path, dbErr)
		}

		return nil
	})

	if err != nil {
		log.Printf("Error scanning directory %s: %v\n", root, err)
	}
}
