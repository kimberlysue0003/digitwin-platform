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
)

type BuildingImport struct {
	PlanningAreaID string           `json:"planningAreaId"`
	Footprint      []models.Point2D `json:"footprint"`
	Height         float64          `json:"height"`
	BuildingType   string           `json:"buildingType"`
	YearBuilt      int              `json:"yearBuilt"`
}

func main() {
	cfg, _ := config.Load()
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	log.Println("Database connected")

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
	log.Println("Clearing existing buildings...")
	db.Exec("DELETE FROM buildings")

	ctx := context.Background()
	startTime := time.Now()

	buildings := make([]models.Building, len(imports))
	for i, imp := range imports {
		buildingType := imp.BuildingType
		buildings[i] = models.Building{
			PlanningAreaID: imp.PlanningAreaID,
			Footprint:      models.Footprint(imp.Footprint),
			Height:         imp.Height,
			BuildingType:   &buildingType,
		}
	}

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

	var count int64
	db.Model(&models.Building{}).Count(&count)

	var stats struct {
		AvgHeight float64
		MaxHeight float64
		MinHeight float64
	}
	db.Model(&models.Building{}).Select("AVG(height) as avg_height, MAX(height) as max_height, MIN(height) as min_height").Scan(&stats)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total buildings: %d\n", count)
	fmt.Printf("Height - Avg: %.2fm, Max: %.2fm, Min: %.2fm\n", stats.AvgHeight, stats.MaxHeight, stats.MinHeight)
}
