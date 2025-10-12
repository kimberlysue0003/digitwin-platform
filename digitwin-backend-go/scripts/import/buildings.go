// Import buildings from JSON with batch processing
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

type BuildingImport struct {
	PlanningAreaID string              `json:"planningAreaId"`
	Footprint      []models.Point2D    `json:"footprint"`
	Height         float64             `json:"height"`
	BuildingType   string              `json:"buildingType"`
	YearBuilt      int                 `json:"yearBuilt"`
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
	if err := db.AutoMigrate(&models.Building{}); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Read JSON file
	jsonPath := os.Getenv("IMPORT_FILE")
	if jsonPath == "" {
		jsonPath = "./data/buildings.json"
	}

	data, err := os.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var imports []BuildingImport
	if err := json.Unmarshal(data, &imports); err != nil {
		log.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	log.Printf("Found %d buildings to import", len(imports))

	// Clear existing data
	log.Println("Clearing existing buildings...")
	db.Exec("DELETE FROM buildings")

	// Convert to models
	ctx := context.Background()
	startTime := time.Now()

	buildings := make([]models.Building, len(imports))
	for i, imp := range imports {
		buildings[i] = models.Building{
			PlanningAreaID: imp.PlanningAreaID,
			Footprint:      models.Footprint(imp.Footprint),
			Height:         imp.Height,
			BuildingType:   imp.BuildingType,
			YearBuilt:      imp.YearBuilt,
		}
	}

	// Batch insert (1000 per batch)
	batchSize := 1000
	total := len(buildings)

	for i := 0; i < total; i += batchSize {
		end := i + batchSize
		if end > total {
			end = total
		}

		batch := buildings[i:end]
		if err := db.WithContext(ctx).CreateInBatches(batch, batchSize).Error; err != nil {
			log.Printf("Failed to insert batch %d-%d: %v", i, end, err)
			continue
		}

		log.Printf("Imported %d/%d buildings", end, total)
	}

	elapsed := time.Since(startTime)
	log.Printf("✅ Import completed: %d buildings in %v", total, elapsed)

	// Print statistics
	printStatistics(db)
}

func printStatistics(db *gorm.DB) {
	var count int64
	db.Model(&models.Building{}).Count(&count)

	var stats struct {
		AvgHeight float64
		MaxHeight float64
		MinHeight float64
	}
	db.Model(&models.Building{}).Select("AVG(height) as avg_height, MAX(height) as max_height, MIN(height) as min_height").Scan(&stats)

	var byArea []struct {
		PlanningAreaID string
		Count          int64
	}
	db.Model(&models.Building{}).Select("planning_area_id, count(*) as count").Group("planning_area_id").Order("count DESC").Limit(10).Scan(&byArea)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total buildings: %d\n", count)
	fmt.Printf("Height - Avg: %.2fm, Max: %.2fm, Min: %.2fm\n", stats.AvgHeight, stats.MaxHeight, stats.MinHeight)
	fmt.Println("\nTop 10 areas by building count:")
	for i, a := range byArea {
		fmt.Printf("  %d. %s: %d buildings\n", i+1, a.PlanningAreaID, a.Count)
	}
}
