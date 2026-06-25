package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	// This will create wi-files.db in the root of the server folder if it doesn't exist
	DB, err = sql.Open("sqlite3", "./wi-files.db")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Verify the connection
	if err = DB.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}

	createTables()
}

func createTables() {
	query := `
	CREATE TABLE IF NOT EXISTS files_index (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		path TEXT NOT NULL,
		filename TEXT NOT NULL,
		size INTEGER NOT NULL,
		modified_date DATETIME NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_filename ON files_index(filename);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_path ON files_index(path);
	`

	_, err := DB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}

	log.Println("Database initialized successfully.")
}
