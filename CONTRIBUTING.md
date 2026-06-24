# Contributing

Thank you for your interest in contributing to WiFiles.

WiFiles is an open-source project that aims to provide a modern, Linux-native, self-hosted file management experience through the web. Whether you're fixing bugs, improving documentation, designing user interfaces, testing features, or writing code, your contributions are appreciated.


## Project Structure

WiFiles consists of two main components:

### Server

The backend is written in [Go](https://go.dev/) and is responsible for authentication, file system access, file uploads, downloads, media streaming, drive detection and providing API endpoints.

The backend source code is located in ```server/ ```

### Client

The frontend is built with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) and provides the browser-based file management interface.

The frontend source code is located in ```client/ ```

Basic knowledge of both Go and React is recommended when contributing to the project.

### Learning Resources

#### Go: https://go.dev/learn/

#### React: https://react.dev/learn

#### TypeScript: https://www.typescriptlang.org/docs/


## Getting Started

Fork the repository and clone your fork locally:

```bash
git clone https://github.com/<your-username>/wi-files.git
cd wi-files
```

Create a new branch for your work:

```bash
git checkout -b feature/my-feature
```


## Development

### Frontend

Prepare the frontend environment:

```bash
cd client
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend development server provides hot reloading and should be used while developing the user interface.


### Backend

Prepare backend dependencies:

```bash
cd server
go mod download
```

Run the backend:

```bash
go run .
```

Build the backend:

```bash
go build
```

## Commit Messages

WiFiles follows the Conventional Commits specification.

Examples:

```text
feat(explorer): add breadcrumb navigation

feat(upload): support drag and drop uploads

fix(auth): prevent invalid session reuse

refactor(files): simplify path resolution

docs: update installation guide
```


## Pull Requests

Before opening a pull request:

* Ensure the project builds successfully.
* Test your changes locally.
* Update relevant documentation.
* Keep pull requests focused on a single feature or fix.
* Provide a clear description of the changes.

A pull request should explain:

* What was changed
* Why it was changed
* Any important implementation details




