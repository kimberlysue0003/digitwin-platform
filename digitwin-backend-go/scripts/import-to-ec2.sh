#!/bin/bash
# Import data to AWS RDS database from EC2 instance

set -e  # Exit on error

echo "=========================================="
echo "DigiTwin Platform - Data Import Script"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "Error: Must run this script from digitwin-backend-go directory"
    exit 1
fi

# Database connection settings (AWS RDS)
export DB_HOST=${DB_HOST:-digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com}
export DB_PORT=${DB_PORT:-5432}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-87Abc_0508}
export DB_NAME=${DB_NAME:-digitwin}
export DB_SSLMODE=${DB_SSLMODE:-require}

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if data files exist
echo "Checking data files..."
if [ ! -f "./data/areas.json" ]; then
    echo "Error: ./data/areas.json not found"
    exit 1
fi
if [ ! -f "./data/buildings.json" ]; then
    echo "Error: ./data/buildings.json not found"
    exit 1
fi
if [ ! -f "./data/streamlines.json" ]; then
    echo "Error: ./data/streamlines.json not found"
    exit 1
fi
if [ ! -f "./data/map_textures.json" ]; then
    echo "Error: ./data/map_textures.json not found"
    exit 1
fi
echo "✓ All data files found"
echo ""

# Import areas
echo "=========================================="
echo "1/4 Importing Planning Areas..."
echo "=========================================="
IMPORT_FILE=./data/areas.json go run scripts/import/areas.go
if [ $? -eq 0 ]; then
    echo "✓ Planning areas imported successfully"
else
    echo "✗ Failed to import planning areas"
    exit 1
fi
echo ""

# Import buildings
echo "=========================================="
echo "2/4 Importing Buildings (this may take a while)..."
echo "=========================================="
IMPORT_FILE=./data/buildings.json go run scripts/import/buildings.go
if [ $? -eq 0 ]; then
    echo "✓ Buildings imported successfully"
else
    echo "✗ Failed to import buildings"
    exit 1
fi
echo ""

# Import streamlines
echo "=========================================="
echo "3/4 Importing Wind Streamlines (large file, please wait)..."
echo "=========================================="
IMPORT_FILE=./data/streamlines.json go run scripts/import/streamlines.go
if [ $? -eq 0 ]; then
    echo "✓ Wind streamlines imported successfully"
else
    echo "✗ Failed to import streamlines"
    exit 1
fi
echo ""

# Import map textures
echo "=========================================="
echo "4/4 Importing Map Textures..."
echo "=========================================="
IMPORT_FILE=./data/map_textures.json go run scripts/import/map_textures.go
if [ $? -eq 0 ]; then
    echo "✓ Map textures imported successfully"
else
    echo "✗ Failed to import map textures"
    exit 1
fi
echo ""

echo "=========================================="
echo "✓ All data imported successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart the Docker container: docker restart digitwin-backend-go"
echo "2. Verify data: curl http://localhost:3000/api/areas"
echo ""
