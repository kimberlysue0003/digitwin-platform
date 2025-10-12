.PHONY: help run build test clean migrate import-all swagger docker-build docker-run

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

run: ## Run development server with hot reload
	air

build: ## Build production binary
	go build -o bin/server cmd/server/main.go

test: ## Run all tests
	go test -v ./...

test-coverage: ## Run tests with coverage
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

clean: ## Clean build artifacts
	rm -rf bin/ tmp/ coverage.out

migrate: ## Run database migration
	go run scripts/migrate/main.go

import-areas: ## Import planning areas
	go run scripts/import_areas/main.go

import-buildings: ## Import buildings data
	go run scripts/import_buildings/main.go

import-streamlines: ## Import wind streamlines
	go run scripts/import_streamlines/main.go

import-all: migrate import-areas import-buildings import-streamlines ## Import all data

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
