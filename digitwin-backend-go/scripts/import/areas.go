// Import planning areas from JSON
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

type AreaImport struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Region      string  `json:"region"`
	BoundsMinLat float64 `json:"boundsMinLat"`
	BoundsMaxLat float64 `json:"boundsMaxLat"`
	BoundsMinLng float64 `json:"boundsMinLng"`
	BoundsMaxLng float64 `json:"boundsMaxLng"`
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
	if err := db.AutoMigrate(&models.PlanningArea{}); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Read JSON file
	jsonPath := os.Getenv("IMPORT_FILE")
	if jsonPath == "" {
		jsonPath = "./data/areas.json"
	}

	data, err := os.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var imports []AreaImport
	if err := json.Unmarshal(data, &imports); err != nil {
		log.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	log.Printf("Found %d areas to import", len(imports))

	// Convert and insert
	ctx := context.Background()
	startTime := time.Now()

	for i, imp := range imports {
		area := models.PlanningArea{
			ID:           imp.ID,
			Name:         imp.Name,
			Region:       imp.Region,
			BoundsMinLat: imp.BoundsMinLat,
			BoundsMaxLat: imp.BoundsMaxLat,
			BoundsMinLng: imp.BoundsMinLng,
			BoundsMaxLng: imp.BoundsMaxLng,
		}

		// Upsert (update if exists)
		result := db.WithContext(ctx).Where("id = ?", area.ID).FirstOrCreate(&area)
		if result.Error != nil {
			log.Printf("Failed to import area %s: %v", area.ID, result.Error)
			continue
		}

		if (i+1)%10 == 0 {
			log.Printf("Imported %d/%d areas", i+1, len(imports))
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("✅ Import completed: %d areas in %v", len(imports), elapsed)

	// Print statistics
	printStatistics(db)
}

func printStatistics(db *gorm.DB) {
	var count int64
	db.Model(&models.PlanningArea{}).Count(&count)

	var regions []struct {
		Region string
		Count  int64
	}
	db.Model(&models.PlanningArea{}).Select("region, count(*) as count").Group("region").Scan(&regions)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total areas: %d\n", count)
	fmt.Println("By region:")
	for _, r := range regions {
		fmt.Printf("  %s: %d\n", r.Region, r.Count)
	}
}
