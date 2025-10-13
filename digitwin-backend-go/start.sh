#!/bin/bash

echo "====================================="
echo " Digital Twin Platform - Go Backend"
echo "====================================="
echo ""

# Check if Docker containers are running
echo "Checking Docker containers..."
if ! docker ps | grep -q digitwin-postgres; then
    echo "Starting PostgreSQL container..."
    docker start digitwin-postgres
fi

if ! docker ps | grep -q digitwin-redis; then
    echo "Starting Redis container..."
    docker start digitwin-redis
fi

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
sleep 2

# Start the server
echo ""
echo "Starting Go backend server..."
echo "Server will be available at: http://localhost:8080"
echo "Health check: http://localhost:8080/health"
echo "WebSocket test: http://localhost:8080/static/ws-test.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "-------------------------------------"
echo ""

go run cmd/server/main.go
