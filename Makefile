.PHONY: help install dev dev-server dev-client build-client build-server build clean

# Colors for terminal output
COLOR_RESET = \033[0m
COLOR_INFO  = \033[32m
COLOR_CMD   = \033[36m

all: help

## help: Show this help message
help:
	@echo "Usage:"
	@echo "  make $(COLOR_CMD)<target>$(COLOR_RESET)"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'

## install: Install all dependencies for both frontend and backend
install:
	@echo "$(COLOR_INFO)Installing Backend dependencies...$(COLOR_RESET)"
	go mod tidy
	@echo "$(COLOR_INFO)Installing Frontend dependencies...$(COLOR_RESET)"
	cd client && npm install

## dev: Run both frontend and backend in development mode concurrently
dev:
	@echo "$(COLOR_INFO)Starting development servers...$(COLOR_RESET)"
	@echo "$(COLOR_INFO)Press Ctrl+C to stop both servers.$(COLOR_RESET)"
	@make -j 2 dev-server dev-client

dev-server:
	go run main.go

dev-client:
	cd client && npm run dev

## build-client: Build the React frontend
build-client:
	@echo "$(COLOR_INFO)Building Frontend...$(COLOR_RESET)"
	cd client && npm run build

## build-server: Build the Go backend binary (embeds client/dist automatically)
build-server:
	@echo "$(COLOR_INFO)Building Backend...$(COLOR_RESET)"
	@mkdir -p bin
	go build -o bin/wi-files main.go

## build: Build both frontend and backend into a single binary
build: build-client build-server
	@echo "$(COLOR_INFO)Build complete! Binary is located in ./bin/wi-files$(COLOR_RESET)"

## clean: Remove build artifacts
clean:
	@echo "$(COLOR_INFO)Cleaning up...$(COLOR_RESET)"
	rm -rf bin/
	rm -rf client/dist/
