# Import all data from JSON files to PostgreSQL (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting data import process..." -ForegroundColor Green
Write-Host ""

# Check if data directory exists
if (-not (Test-Path "./data")) {
    Write-Host "❌ Error: ./data directory not found" -ForegroundColor Red
    Write-Host "Please run the export script first:" -ForegroundColor Yellow
    Write-Host "  node scripts/export_from_nodejs.js" -ForegroundColor Yellow
    exit 1
}

# Import areas
Write-Host "📍 Importing planning areas..." -ForegroundColor Cyan
$env:IMPORT_FILE = "./data/areas.json"
go run scripts/import/areas.go
Write-Host ""

# Import buildings
Write-Host "🏢 Importing buildings..." -ForegroundColor Cyan
$env:IMPORT_FILE = "./data/buildings.json"
go run scripts/import/buildings.go
Write-Host ""

# Import streamlines
Write-Host "💨 Importing wind streamlines..." -ForegroundColor Cyan
$env:IMPORT_FILE = "./data/streamlines.json"
go run scripts/import/streamlines.go
Write-Host ""

# Import map textures
Write-Host "🗺️  Importing map textures..." -ForegroundColor Cyan
$env:IMPORT_FILE = "./data/map_textures.json"
go run scripts/import/map_textures.go
Write-Host ""

Write-Host "✅ All data imported successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start the server: make run" -ForegroundColor White
Write-Host "  2. Check health: curl http://localhost:8080/health" -ForegroundColor White
Write-Host "  3. Test API: curl http://localhost:8080/api/areas" -ForegroundColor White
