// Import map texture metadata from JSON files
package main

import (
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// MapTextureImport represents the structure of JSON files
type MapTextureImport struct {
	ID     string      `json:"id"`
	Name   string      `json:"name"`
	Bounds [][]float64 `json:"bounds"` // [[minLat, minLng], [maxLat, maxLng]]
	Center []float64   `json:"center"` // [lat, lng]
	Zoom   int         `json:"zoom"`
	Size   []int       `json:"size"` // [width, height]
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	log.Println("✅ Database connected")

	// Drop table if exists to recreate without foreign key
	db.Exec("DROP TABLE IF EXISTS map_textures CASCADE")
	log.Println("🗑️  Dropped existing map_textures table")

	// Auto-migrate (disable foreign key for PlanningAreaID)
	if err := db.Migrator().CreateTable(&models.MapTexture{}); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Directory containing map texture JSON files
	dir := "./static/map-textures"

	// Find all JSON files
	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		log.Fatalf("Failed to read directory: %v", err)
	}

	log.Printf("📁 Found %d JSON files\n", len(files))

	// Parse and prepare data
	mapTextures := make([]models.MapTexture, 0, len(files))

	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			log.Printf("❌ Failed to read %s: %v", file, err)
			continue
		}

		var imp MapTextureImport
		if err := json.Unmarshal(data, &imp); err != nil {
			log.Printf("❌ Failed to parse %s: %v", file, err)
			continue
		}

		// Validate data
		if len(imp.Bounds) != 2 || len(imp.Bounds[0]) != 2 || len(imp.Bounds[1]) != 2 {
			log.Printf("❌ Invalid bounds in %s", file)
			continue
		}
		if len(imp.Center) != 2 {
			log.Printf("❌ Invalid center in %s", file)
			continue
		}
		if len(imp.Size) != 2 {
			log.Printf("❌ Invalid size in %s", file)
			continue
		}

		// Construct PNG file path
		pngPath := fmt.Sprintf("/static/map-textures/%s.png", imp.ID)

		mapTexture := models.MapTexture{
			PlanningAreaID: imp.ID,
			PNGFilePath:    pngPath,
			BoundsMinLat:   imp.Bounds[0][0],
			BoundsMinLng:   imp.Bounds[0][1],
			BoundsMaxLat:   imp.Bounds[1][0],
			BoundsMaxLng:   imp.Bounds[1][1],
			CenterLat:      imp.Center[0],
			CenterLng:      imp.Center[1],
			Zoom:           imp.Zoom,
			Width:          imp.Size[0],
			Height:         imp.Size[1],
		}

		mapTextures = append(mapTextures, mapTexture)
	}

	log.Printf("✅ Parsed %d map textures\n", len(mapTextures))

	// Insert in batch
	startTime := time.Now()
	if err := db.CreateInBatches(mapTextures, 100).Error; err != nil {
		log.Fatalf("Failed to insert map textures: %v", err)
	}
	duration := time.Since(startTime)

	log.Printf("✅ Successfully imported %d map textures in %v\n", len(mapTextures), duration)

	// Verify count
	var count int64
	db.Model(&models.MapTexture{}).Count(&count)
	log.Printf("📊 Total map textures in database: %d\n", count)
}
