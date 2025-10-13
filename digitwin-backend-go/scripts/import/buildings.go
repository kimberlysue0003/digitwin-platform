// Import buildings from frontend JSON files into PostgreSQL database
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
	"path/filepath"
	"time"

	"gorm.io/gorm"
)

// BuildingImport represents the structure of building data in JSON files
type BuildingImport struct {
	Footprint [][]float64 `json:"footprint"` // [[x, z], [x, z], ...]
	Height    float64     `json:"height"`
}

// BuildingFileData represents the structure of entire building JSON file
type BuildingFileData struct {
	PlanningArea  string           `json:"planningArea"`
	ID            string           `json:"id"`
	BuildingCount int              `json:"buildingCount"`
	Buildings     []BuildingImport `json:"buildings"`
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

	// Drop and recreate buildings table
	log.Println("⚠️  Dropping existing buildings table...")
	db.Exec("DROP TABLE IF EXISTS buildings CASCADE")
	db.Migrator().CreateTable(&models.Building{})
	log.Println("✅ Buildings table recreated")

	// Path to frontend buildings directory
	buildingsDir := filepath.Join("..", "digitwin-frontend", "public", "buildings")

	// Get all JSON files
	files, err := filepath.Glob(filepath.Join(buildingsDir, "*.json"))
	if err != nil {
		log.Fatalf("Failed to read buildings directory: %v", err)
	}

	if len(files) == 0 {
		log.Fatalf("No building JSON files found in %s", buildingsDir)
	}

	log.Printf("📦 Found %d building JSON files\n", len(files))

	ctx := context.Background()
	totalBuildings := 0
	startTime := time.Now()

	// Process each file
	for i, filePath := range files {
		areaName := filepath.Base(filePath[:len(filePath)-5]) // Remove .json

		log.Printf("[%d/%d] Processing %s...", i+1, len(files), areaName)

		// Read JSON file
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("❌ Failed to read %s: %v", filePath, err)
			continue
		}

		// Parse JSON
		var fileData BuildingFileData
		if err := json.Unmarshal(data, &fileData); err != nil {
			log.Printf("❌ Failed to parse %s: %v", filePath, err)
			continue
		}

		// Transform to database model
		buildings := make([]models.Building, 0, len(fileData.Buildings))
		now := time.Now()

		for _, imp := range fileData.Buildings {
			// Convert footprint from [][]float64 to []Point2D
			footprint := make(models.Footprint, len(imp.Footprint))
			for j, point := range imp.Footprint {
				if len(point) >= 2 {
					footprint[j] = models.Point2D{
						X: point[0],
						Z: point[1],
					}
				}
			}

			building := models.Building{
				PlanningAreaID: fileData.PlanningArea,
				Footprint:      footprint,
				Height:         imp.Height,
				Source:         "Frontend JSON File",
				FetchedAt:      now,
				CreatedAt:      now,
			}

			buildings = append(buildings, building)
		}

		// Batch insert (1000 buildings at a time)
		batchSize := 1000
		for i := 0; i < len(buildings); i += batchSize {
			end := i + batchSize
			if end > len(buildings) {
				end = len(buildings)
			}

			batch := buildings[i:end]
			if err := db.WithContext(ctx).CreateInBatches(batch, batchSize).Error; err != nil {
				log.Printf("❌ Failed to insert buildings for %s (batch %d): %v", areaName, i/batchSize+1, err)
				continue
			}
		}

		totalBuildings += len(buildings)
		log.Printf("   ✅ Imported %d buildings for %s", len(buildings), areaName)
	}

	elapsed := time.Since(startTime)
	log.Printf("\n🎉 Import completed!")
	log.Printf("   Total areas: %d", len(files))
	log.Printf("   Total buildings: %d", totalBuildings)
	log.Printf("   Time elapsed: %v", elapsed)
	log.Printf("   Average: %.0f buildings/sec", float64(totalBuildings)/elapsed.Seconds())

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
