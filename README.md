<h3 align="center">
  <img src="logo/WiFiles/wifiles-logo.png" alt="WiFiles Logo" width="48" style="border-radius: 50%; vertical-align: middle; margin-right: 10px;" />
  <span style="font-family: 'Ubuntu', sans-serif; vertical-align: middle; font-size: 1.3em;">WiFiles</span>
</h3>

**wi-files** is a self-hosted private file server that brings the familiar, polished experience of the Ubuntu GNOME Nautilus file manager to your web browser. 

## Features

### Frontend (React-TS)
- Nautilus-Inspired UI
- Client-Side Routing
- Media Previews

### Server (Go)
- Background Indexing
- Drive Management
- Secure File Access
- Media Streaming

## Prerequisites

- **Linux Environment**: The server relies on Linux-specific tools like `lsblk` for drive management.
- **Go**: `1.20+` recommended for the server server.
- **Node.js**: `16+` for the React frontend.

## Getting Started

### 1. Start the server Server

```bash
cd server
go mod tidy
go run main.go
```
The server will initialize the SQLite database, start the background filesystem scanner, and listen on `http://localhost:8080`.

### 2. Start the Frontend Client

In a new terminal window:

```bash
cd client
npm install
npm run dev
```
The frontend will be served by Vite, usually at `http://localhost:5173`.

### 3. Usage
Navigate to the frontend URL in your browser. You will be prompted to log in. Once authenticated, you can browse your local filesystem, view media, and monitor mounted drives exactly as you would natively in Ubuntu.


## License

See the [LICENSE](LICENSE) file for details.
