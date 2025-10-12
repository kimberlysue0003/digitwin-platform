// Import wind streamlines from JSON
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

type StreamlineImport struct {
	PlanningAreaID string             `json:"planningAreaId"`
	Direction      string             `json:"direction"`
	Points         []models.Point3D   `json:"points"`
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
	if err := db.AutoMigrate(&models.WindStreamline{}); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Read JSON file
	jsonPath := os.Getenv("IMPORT_FILE")
	if jsonPath == "" {
		jsonPath = "./data/streamlines.json"
	}

	data, err := os.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var imports []StreamlineImport
	if err := json.Unmarshal(data, &imports); err != nil {
		log.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	log.Printf("Found %d streamlines to import", len(imports))

	// Clear existing data
	log.Println("Clearing existing streamlines...")
	db.Exec("DELETE FROM wind_streamlines")

	// Convert to models
	ctx := context.Background()
	startTime := time.Now()

	streamlines := make([]models.WindStreamline, len(imports))
	for i, imp := range imports {
		streamlines[i] = models.WindStreamline{
			PlanningAreaID: imp.PlanningAreaID,
			Direction:      imp.Direction,
			Points:         models.StreamlinePoints(imp.Points),
		}
	}

	// Batch insert (500 per batch - streamlines have more data)
	batchSize := 500
	total := len(streamlines)

	for i := 0; i < total; i += batchSize {
		end := i + batchSize
		if end > total {
			end = total
		}

		batch := streamlines[i:end]
		if err := db.WithContext(ctx).CreateInBatches(batch, batchSize).Error; err != nil {
			log.Printf("Failed to insert batch %d-%d: %v", i, end, err)
			continue
		}

		log.Printf("Imported %d/%d streamlines", end, total)
	}

	elapsed := time.Since(startTime)
	log.Printf("✅ Import completed: %d streamlines in %v", total, elapsed)

	// Print statistics
	printStatistics(db)
}

func printStatistics(db *gorm.DB) {
	var count int64
	db.Model(&models.WindStreamline{}).Count(&count)

	var byDirection []struct {
		Direction string
		Count     int64
	}
	db.Model(&models.WindStreamline{}).Select("direction, count(*) as count").Group("direction").Order("direction").Scan(&byDirection)

	var byArea []struct {
		PlanningAreaID string
		Count          int64
	}
	db.Model(&models.WindStreamline{}).Select("planning_area_id, count(*) as count").Group("planning_area_id").Order("count DESC").Limit(10).Scan(&byArea)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total streamlines: %d\n", count)
	fmt.Println("\nBy direction:")
	for _, d := range byDirection {
		fmt.Printf("  %s: %d\n", d.Direction, d.Count)
	}
	fmt.Println("\nTop 10 areas by streamline count:")
	for i, a := range byArea {
		fmt.Printf("  %d. %s: %d streamlines\n", i+1, a.PlanningAreaID, a.Count)
	}
}
