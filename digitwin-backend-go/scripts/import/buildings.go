// Import buildings from data/buildings.json into PostgreSQL database
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

// FootprintPoint represents a point in the building footprint
type FootprintPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// BuildingImport represents the structure of building data in JSON file
type BuildingImport struct {
	PlanningAreaID string           `json:"planningAreaId"`
	Footprint      []FootprintPoint `json:"footprint"`
	Height         float64          `json:"height"`
	BuildingType   string           `json:"buildingType"`
	YearBuilt      int              `json:"yearBuilt"`
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	log.Println("✅ Database connected")

	// Get import file path from environment or use default
	importFile := os.Getenv("IMPORT_FILE")
	if importFile == "" {
		importFile = "./data/buildings.json"
	}

	log.Printf("📦 Reading buildings from: %s\n", importFile)

	// Read JSON file
	data, err := os.ReadFile(importFile)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	// Parse JSON
	var buildingsData []BuildingImport
	if err := json.Unmarshal(data, &buildingsData); err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	log.Printf("📦 Found %d buildings to import\n", len(buildingsData))

	// Drop and recreate buildings table
	log.Println("⚠️  Dropping existing buildings table...")
	db.Exec("DROP TABLE IF EXISTS buildings CASCADE")
	db.Migrator().CreateTable(&models.Building{})
	log.Println("✅ Buildings table recreated")

	ctx := context.Background()
	startTime := time.Now()

	// Transform to database model
	buildings := make([]models.Building, 0, len(buildingsData))
	now := time.Now()

	for _, imp := range buildingsData {
		// Convert footprint from []FootprintPoint to []Point2D
		footprint := make(models.Footprint, len(imp.Footprint))
		for j, point := range imp.Footprint {
			footprint[j] = models.Point2D{
				X: point.X,
				Z: point.Y,
			}
		}

		building := models.Building{
			PlanningAreaID: imp.PlanningAreaID,
			Footprint:      footprint,
			Height:         imp.Height,
			Source:         "Data Import",
			FetchedAt:      now,
			CreatedAt:      now,
		}

		buildings = append(buildings, building)
	}

	// Batch insert (1000 buildings at a time)
	batchSize := 1000
	totalInserted := 0

	for i := 0; i < len(buildings); i += batchSize {
		end := i + batchSize
		if end > len(buildings) {
			end = len(buildings)
		}

		batch := buildings[i:end]
		if err := db.WithContext(ctx).CreateInBatches(batch, batchSize).Error; err != nil {
			log.Printf("❌ Failed to insert buildings (batch %d): %v", i/batchSize+1, err)
			continue
		}

		totalInserted += len(batch)
		if totalInserted%5000 == 0 {
			log.Printf("   Imported %d/%d buildings...", totalInserted, len(buildings))
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("\n✅ Import completed: %d buildings in %v", totalInserted, elapsed)
	log.Printf("   Average: %.0f buildings/sec", float64(totalInserted)/elapsed.Seconds())

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
