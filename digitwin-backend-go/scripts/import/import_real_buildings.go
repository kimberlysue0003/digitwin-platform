// Import real building data from frontend dist folder
package main

import (
	"context"
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/gorm"
)

// BuildingJSON represents the JSON structure from frontend
type BuildingJSON struct {
	PlanningArea string `json:"planningArea"`
	ID           string `json:"id"`
	BuildingCount int   `json:"buildingCount"`
	Buildings    []struct {
		Footprint [][]float64 `json:"footprint"`
		Height    float64     `json:"height"`
	} `json:"buildings"`
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

	// Auto-migrate
	if err := db.AutoMigrate(&models.PlanningArea{}, &models.Building{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Path to frontend dist/buildings folder
	buildingsDir := "../../digitwin-frontend/dist/buildings"
	if len(os.Args) > 1 {
		buildingsDir = os.Args[1]
	}

	absPath, err := filepath.Abs(buildingsDir)
	if err != nil {
		log.Fatalf("Failed to resolve path: %v", err)
	}

	log.Printf("📂 Reading from: %s\n", absPath)

	// Read all JSON files
	files, err := ioutil.ReadDir(absPath)
	if err != nil {
		log.Fatalf("Failed to read directory: %v", err)
	}

	totalAreas := 0
	totalBuildings := 0

	for _, file := range files {
		if filepath.Ext(file.Name()) != ".json" {
			continue
		}

		filePath := filepath.Join(absPath, file.Name())
		log.Printf("\n📍 Processing: %s", file.Name())

		// Read JSON file
		data, err := ioutil.ReadFile(filePath)
		if err != nil {
			log.Printf("❌ Failed to read %s: %v", file.Name(), err)
			continue
		}

		var buildingData BuildingJSON
		if err := json.Unmarshal(data, &buildingData); err != nil {
			log.Printf("❌ Failed to parse %s: %v", file.Name(), err)
			continue
		}

		// Check if planning area exists, if not create it
		var area models.PlanningArea
		result := db.Where("id = ?", buildingData.ID).First(&area)
		if result.Error == gorm.ErrRecordNotFound {
			// Create planning area
			area = models.PlanningArea{
				ID:     buildingData.ID,
				Name:   buildingData.PlanningArea,
				Region: "unknown", // We don't have region info in the JSON
				// Bounds will be calculated from building footprints
				CenterLat:    1.35,
				CenterLng:    103.8,
				BoundsMinLat: 1.3,
				BoundsMinLng: 103.7,
				BoundsMaxLat: 1.4,
				BoundsMaxLng: 103.9,
			}
			if err := db.Create(&area).Error; err != nil {
				log.Printf("❌ Failed to create area %s: %v", buildingData.ID, err)
				continue
			}
			log.Printf("✅ Created planning area: %s", buildingData.PlanningArea)
		}

		// Delete existing buildings for this area
		if err := db.Where("planning_area_id = ?", buildingData.ID).Delete(&models.Building{}).Error; err != nil {
			log.Printf("⚠️  Failed to delete existing buildings: %v", err)
		}

		// Import buildings in batches
		batchSize := 500
		buildings := make([]models.Building, 0, batchSize)

		for i, b := range buildingData.Buildings {
			// Convert footprint to JSON format
			footprint := make([]map[string]float64, len(b.Footprint))
			for j, point := range b.Footprint {
				footprint[j] = map[string]float64{
					"x": point[0],
					"z": point[1],
				}
			}

			footprintJSON, _ := json.Marshal(footprint)

			building := models.Building{
				PlanningAreaID: buildingData.ID,
				Footprint:      footprintJSON,
				Height:         b.Height,
				BuildingType:   "building",
				Source:         "OpenStreetMap",
				FetchedAt:      time.Now(),
			}

			buildings = append(buildings, building)

			// Insert batch when full or at end
			if len(buildings) == batchSize || i == len(buildingData.Buildings)-1 {
				if err := db.CreateInBatches(buildings, batchSize).Error; err != nil {
					log.Printf("❌ Failed to insert batch: %v", err)
				} else {
					totalBuildings += len(buildings)
					log.Printf("   Imported %d/%d buildings", i+1, buildingData.BuildingCount)
				}
				buildings = buildings[:0] // Clear slice
			}
		}

		totalAreas++
		log.Printf("✅ Completed: %s (%d buildings)", buildingData.PlanningArea, buildingData.BuildingCount)
	}

	log.Printf("\n🎉 Import completed!")
	log.Printf("   Areas: %d", totalAreas)
	log.Printf("   Buildings: %d", totalBuildings)

	// Close database
	sqlDB, _ := db.DB()
	sqlDB.Close()
}
