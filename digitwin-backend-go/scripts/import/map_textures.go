// Import map textures from JSON
package main

import (
	"context"
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/gorm"
)

type MapTextureImport struct {
	PlanningAreaID string  `json:"planningAreaId"`
	PNGFilePath    string  `json:"pngFilePath"`
	BoundsMinLat   float64 `json:"boundsMinLat"`
	BoundsMaxLat   float64 `json:"boundsMaxLat"`
	BoundsMinLng   float64 `json:"boundsMinLng"`
	BoundsMaxLng   float64 `json:"boundsMaxLng"`
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	log.Println("Database connected")

	// Auto-migrate
	if err := db.AutoMigrate(&models.MapTexture{}); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Read JSON file
	jsonPath := os.Getenv("IMPORT_FILE")
	if jsonPath == "" {
		jsonPath = "./data/map_textures.json"
	}

	data, err := os.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var imports []MapTextureImport
	if err := json.Unmarshal(data, &imports); err != nil {
		log.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	log.Printf("Found %d map textures to import", len(imports))

	// Convert and insert
	ctx := context.Background()
	startTime := time.Now()

	for i, imp := range imports {
		mapTexture := models.MapTexture{
			PlanningAreaID: imp.PlanningAreaID,
			PNGFilePath:    imp.PNGFilePath,
			BoundsMinLat:   imp.BoundsMinLat,
			BoundsMaxLat:   imp.BoundsMaxLat,
			BoundsMinLng:   imp.BoundsMinLng,
			BoundsMaxLng:   imp.BoundsMaxLng,
		}

		// Upsert
		result := db.WithContext(ctx).Where("planning_area_id = ?", mapTexture.PlanningAreaID).FirstOrCreate(&mapTexture)
		if result.Error != nil {
			log.Printf("Failed to import map texture %s: %v", mapTexture.PlanningAreaID, result.Error)
			continue
		}

		// Check if file exists
		fullPath := cfg.App.StaticPath + "/" + imp.PNGFilePath
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			log.Printf("⚠️  Warning: File not found: %s", fullPath)
		}

		if (i+1)%10 == 0 {
			log.Printf("Imported %d/%d map textures", i+1, len(imports))
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("✅ Import completed: %d map textures in %v", len(imports), elapsed)

	// Print statistics
	printStatistics(db)
}

func printStatistics(db *gorm.DB) {
	var count int64
	db.Model(&models.MapTexture{}).Count(&count)

	var textures []models.MapTexture
	db.Find(&textures)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total map textures: %d\n", count)
	fmt.Println("\nMap textures:")
	for i, t := range textures {
		fmt.Printf("  %d. %s -> %s\n", i+1, t.PlanningAreaID, t.PNGFilePath)
	}
}
