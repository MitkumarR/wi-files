package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
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
	CREATE INDEX IF NOT EXISTS idx_path ON files_index(path);

	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL
	);
	`

	_, err := DB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}

	// Insert default admin if not exists (password: 'admin')
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = 'admin'").Scan(&count)
	if count == 0 {
		hashBytes, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		if err == nil {
			_, err = DB.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", "admin", string(hashBytes), "admin")
			if err != nil {
				log.Printf("Failed to insert default admin: %v", err)
			} else {
				log.Println("Created default admin user.")
			}
		}
	}

	log.Println("Database initialized successfully.")
}
