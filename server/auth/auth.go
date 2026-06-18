package auth

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var JwtKey = []byte("my_secret_key_change_in_production")

// LinuxUser represents a human user parsed from /etc/passwd
type LinuxUser struct {
	Username string `json:"username"`
	UID      int    `json:"uid"`
	GID      int    `json:"gid"`
	FullName string `json:"fullName"`
	HomeDir  string `json:"homeDir"`
	Shell    string `json:"shell"`
	HasAvatar bool  `json:"hasAvatar"`
}

// Claims for JWT tokens
type Claims struct {
	Username string `json:"username"`
	UID      int    `json:"uid"`
	GID      int    `json:"gid"`
	HomeDir  string `json:"homeDir"`
	jwt.RegisteredClaims
}

// Credentials for login request
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// getLinuxUsers parses /etc/passwd and returns human users (UID >= 1000, < 65534, valid shell)
func getLinuxUsers() ([]LinuxUser, error) {
	f, err := os.Open("/etc/passwd")
	if err != nil {
		return nil, fmt.Errorf("failed to open /etc/passwd: %w", err)
	}
	defer f.Close()

	var users []LinuxUser
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Split(line, ":")
		if len(fields) < 7 {
			continue
		}

		uid, err := strconv.Atoi(fields[2])
		if err != nil {
			continue
		}
		gid, err := strconv.Atoi(fields[3])
		if err != nil {
			continue
		}

		// Only include human users: UID >= 1000, < 65534 (nobody), valid shell
		shell := fields[6]
		if uid < 1000 || uid >= 65534 {
			continue
		}
		if strings.Contains(shell, "nologin") || strings.Contains(shell, "false") {
			continue
		}

		// Extract full name from GECOS field (first comma-separated value)
		fullName := fields[4]
		if idx := strings.Index(fullName, ","); idx >= 0 {
			fullName = fullName[:idx]
		}
		if fullName == "" {
			fullName = fields[0] // fallback to username
		}

		// Check for user avatar
		avatarPath := fmt.Sprintf("/var/lib/AccountsService/icons/%s", fields[0])
		hasAvatar := false
		if _, err := os.Stat(avatarPath); err == nil {
			hasAvatar = true
		}

		users = append(users, LinuxUser{
			Username:  fields[0],
			UID:       uid,
			GID:       gid,
			FullName:  fullName,
			HomeDir:   fields[5],
			Shell:     shell,
			HasAvatar: hasAvatar,
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading /etc/passwd: %w", err)
	}

	return users, nil
}

// authenticateLinuxUser verifies credentials against the Linux system using `su`
func authenticateLinuxUser(username, password string) bool {
	// Use `su` to verify the password. The `-c true` runs a no-op command.
	cmd := exec.Command("su", "-c", "true", username)
	cmd.Stdin = strings.NewReader(password + "\n")

	err := cmd.Run()
	return err == nil
}

// HandleUsers returns the list of available Linux users
func HandleUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	users, err := getLinuxUsers()
	if err != nil {
		http.Error(w, "Failed to list users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// HandleUserAvatar serves the GNOME AccountsService avatar for a user
func HandleUserAvatar(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Missing username", http.StatusBadRequest)
		return
	}

	// Sanitize: username must not contain path separators
	if strings.ContainsAny(username, "/\\..") {
		http.Error(w, "Invalid username", http.StatusBadRequest)
		return
	}

	avatarPath := fmt.Sprintf("/var/lib/AccountsService/icons/%s", username)
	if _, err := os.Stat(avatarPath); os.IsNotExist(err) {
		http.Error(w, "Avatar not found", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, avatarPath)
}

// HandleLogin authenticates a user against the Linux system
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if creds.Username == "" || creds.Password == "" {
		http.Error(w, "Username and password required", http.StatusBadRequest)
		return
	}

	// Verify the user exists in our parsed user list
	users, err := getLinuxUsers()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var foundUser *LinuxUser
	for _, u := range users {
		if u.Username == creds.Username {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Authenticate against Linux PAM via su
	if !authenticateLinuxUser(creds.Username, creds.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate JWT
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: foundUser.Username,
		UID:      foundUser.UID,
		GID:      foundUser.GID,
		HomeDir:  foundUser.HomeDir,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JwtKey)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":    tokenString,
		"username": foundUser.Username,
		"homeDir":  foundUser.HomeDir,
		"fullName": foundUser.FullName,
	})
}
