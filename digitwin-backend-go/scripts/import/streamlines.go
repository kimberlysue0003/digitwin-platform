// Import wind streamlines from JSON with batch processing
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

type StreamlineImport struct {
	PlanningAreaID string           `json:"planningAreaId"`
	Direction      string           `json:"direction"`
	Points         []models.Point3D `json:"points"`
}

func main() {
	cfg, _ := config.Load()
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	log.Println("Database connected")

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
	log.Println("Clearing existing streamlines...")
	db.Exec("DELETE FROM wind_streamlines")

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

	var count int64
	db.Model(&models.WindStreamline{}).Count(&count)

	// Count by direction
	type DirectionCount struct {
		Direction string
		Count     int64
	}
	var dirCounts []DirectionCount
	db.Model(&models.WindStreamline{}).
		Select("direction, COUNT(*) as count").
		Group("direction").
		Order("direction").
		Scan(&dirCounts)

	fmt.Println("\n📊 Statistics:")
	fmt.Printf("Total streamlines: %d\n", count)
	fmt.Println("By direction:")
	for _, dc := range dirCounts {
		fmt.Printf("  %s: %d\n", dc.Direction, dc.Count)
	}

	// Top areas
	type AreaCount struct {
		PlanningAreaID string
		Count          int64
	}
	var areaCounts []AreaCount
	db.Model(&models.WindStreamline{}).
		Select("planning_area_id, COUNT(*) as count").
		Group("planning_area_id").
		Order("count DESC").
		Limit(10).
		Scan(&areaCounts)

	fmt.Println("\n🌬️ Top 10 Areas by Streamline Count:")
	for _, ac := range areaCounts {
		fmt.Printf("  %s: %d streamlines\n", ac.PlanningAreaID, ac.Count)
	}
}
