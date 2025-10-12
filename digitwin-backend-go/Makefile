.PHONY: help run build test clean export import-all import-areas import-buildings import-streamlines import-map-textures swagger docker-build docker-run

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

run: ## Run development server
	go run cmd/server/main.go

dev: ## Run with hot reload (requires air)
	air

build: ## Build production binary
	go build -o bin/server cmd/server/main.go

test: ## Run all tests
	go test -v ./...

test-coverage: ## Run tests with coverage
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

clean: ## Clean build artifacts
	rm -rf bin/ tmp/ coverage.out data/

export: ## Export data from Node.js backend to JSON
	node scripts/export_from_nodejs.js

import-areas: ## Import planning areas
	IMPORT_FILE=./data/areas.json go run scripts/import/areas.go

import-buildings: ## Import buildings data
	IMPORT_FILE=./data/buildings.json go run scripts/import/buildings.go

import-streamlines: ## Import wind streamlines
	IMPORT_FILE=./data/streamlines.json go run scripts/import/streamlines.go

import-map-textures: ## Import map textures
	IMPORT_FILE=./data/map_textures.json go run scripts/import/map_textures.go

import-all: export import-areas import-buildings import-streamlines import-map-textures ## Export and import all data

swagger: ## Generate Swagger documentation
	swag init -g cmd/server/main.go -o docs

docker-build: ## Build Docker image
	docker build -t digitwin-backend-go .

docker-run: ## Run Docker container
	docker run -d -p 3000:3000 --name digitwin-backend digitwin-backend-go

docker-stop: ## Stop Docker container
	docker stop digitwin-backend
	docker rm digitwin-backend

deps: ## Install dependencies
	go mod download
	go install github.com/air-verse/air@latest
	go install github.com/swaggo/swag/cmd/swag@latest

fmt: ## Format code
	go fmt ./...

lint: ## Run linter
	golangci-lint run
