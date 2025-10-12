#!/bin/bash
# Import all data from JSON files to PostgreSQL

set -e

echo "🚀 Starting data import process..."
echo ""

# Check if data directory exists
if [ ! -d "./data" ]; then
  echo "❌ Error: ./data directory not found"
  echo "Please run the export script first:"
  echo "  node scripts/export_from_nodejs.js"
  exit 1
fi

# Import areas
echo "📍 Importing planning areas..."
IMPORT_FILE=./data/areas.json go run scripts/import/areas.go
echo ""

# Import buildings
echo "🏢 Importing buildings..."
IMPORT_FILE=./data/buildings.json go run scripts/import/buildings.go
echo ""

# Import streamlines
echo "💨 Importing wind streamlines..."
IMPORT_FILE=./data/streamlines.json go run scripts/import/streamlines.go
echo ""

# Import map textures
echo "🗺️  Importing map textures..."
IMPORT_FILE=./data/map_textures.json go run scripts/import/map_textures.go
echo ""

echo "✅ All data imported successfully!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start the server: make run"
echo "  2. Check health: curl http://localhost:8080/health"
echo "  3. Test API: curl http://localhost:8080/api/areas"
