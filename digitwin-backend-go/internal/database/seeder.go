package database

import (
	"digitwin-backend/internal/models"
	"encoding/json"
	"log"
	"os"
	"time"

	"gorm.io/gorm"
)

// SeedDatabase checks if database is empty and seeds it with initial data
func SeedDatabase(db *gorm.DB) error {
	log.Println("🌱 Checking if database needs seeding...")

	// Check if areas exist
	var areaCount int64
	db.Model(&models.PlanningArea{}).Count(&areaCount)

	if areaCount > 0 {
		log.Printf("✓ Database already has %d areas, skipping seed", areaCount)
		return nil
	}

	log.Println("📦 Database is empty, starting data import...")
	startTime := time.Now()

	// Import areas
	if err := seedAreas(db); err != nil {
		return err
	}

	// Import buildings
	if err := seedBuildings(db); err != nil {
		return err
	}

	// Import streamlines
	if err := seedStreamlines(db); err != nil {
		return err
	}

	// Import map textures
	if err := seedMapTextures(db); err != nil {
		return err
	}

	elapsed := time.Since(startTime)
	log.Printf("✅ Database seeding completed in %v", elapsed)

	return nil
}

// seedAreas imports planning areas from JSON
func seedAreas(db *gorm.DB) error {
	log.Println("  → Importing areas...")

	data, err := os.ReadFile("./data/areas.json")
	if err != nil {
		return err
	}

	var areas []models.PlanningArea
	if err := json.Unmarshal(data, &areas); err != nil {
		return err
	}

	if err := db.Create(&areas).Error; err != nil {
		return err
	}

	log.Printf("    ✓ Imported %d areas", len(areas))
	return nil
}

// FootprintPoint for JSON parsing
type FootprintPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// BuildingImport for JSON parsing
type BuildingImport struct {
	PlanningAreaID string           `json:"planningAreaId"`
	Footprint      []FootprintPoint `json:"footprint"`
	Height         float64          `json:"height"`
	BuildingType   string           `json:"buildingType"`
	YearBuilt      int              `json:"yearBuilt"`
}

// seedBuildings imports buildings from JSON
func seedBuildings(db *gorm.DB) error {
	log.Println("  → Importing buildings...")

	data, err := os.ReadFile("./data/buildings.json")
	if err != nil {
		return err
	}

	var buildingsData []BuildingImport
	if err := json.Unmarshal(data, &buildingsData); err != nil {
		return err
	}

	// Transform to database model
	buildings := make([]models.Building, 0, len(buildingsData))
	now := time.Now()

	for _, imp := range buildingsData {
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
			Source:         "Initial Seed",
			FetchedAt:      now,
			CreatedAt:      now,
		}

		buildings = append(buildings, building)
	}

	// Batch insert
	batchSize := 1000
	for i := 0; i < len(buildings); i += batchSize {
		end := i + batchSize
		if end > len(buildings) {
			end = len(buildings)
		}

		batch := buildings[i:end]
		if err := db.CreateInBatches(batch, batchSize).Error; err != nil {
			return err
		}

		if (i+batchSize)%5000 == 0 || end == len(buildings) {
			log.Printf("    ... %d/%d buildings", end, len(buildings))
		}
	}

	log.Printf("    ✓ Imported %d buildings", len(buildings))
	return nil
}

// StreamlineImport for JSON parsing
type StreamlineImport struct {
	PlanningAreaID string           `json:"planningAreaId"`
	Direction      string           `json:"direction"`
	Points         []models.Point3D `json:"points"`
}

// seedStreamlines imports wind streamlines from JSON
func seedStreamlines(db *gorm.DB) error {
	log.Println("  → Importing streamlines...")

	data, err := os.ReadFile("./data/streamlines.json")
	if err != nil {
		return err
	}

	var imports []StreamlineImport
	if err := json.Unmarshal(data, &imports); err != nil {
		return err
	}

	streamlines := make([]models.WindStreamline, len(imports))
	now := time.Now()

	for i, imp := range imports {
		streamlines[i] = models.WindStreamline{
			PlanningAreaID: imp.PlanningAreaID,
			Direction:      imp.Direction,
			Points:         imp.Points,
			CreatedAt:      now,
		}
	}

	// Batch insert
	batchSize := 500
	for i := 0; i < len(streamlines); i += batchSize {
		end := i + batchSize
		if end > len(streamlines) {
			end = len(streamlines)
		}

		batch := streamlines[i:end]
		if err := db.CreateInBatches(batch, batchSize).Error; err != nil {
			return err
		}
	}

	log.Printf("    ✓ Imported %d streamlines", len(streamlines))
	return nil
}

// MapTextureImport for JSON parsing
type MapTextureImport struct {
	PlanningAreaID string  `json:"planningAreaId"`
	PNGFilePath    string  `json:"pngFilePath"`
	BoundsMinLat   float64 `json:"boundsMinLat"`
	BoundsMaxLat   float64 `json:"boundsMaxLat"`
	BoundsMinLng   float64 `json:"boundsMinLng"`
	BoundsMaxLng   float64 `json:"boundsMaxLng"`
}

// seedMapTextures imports map textures from JSON
func seedMapTextures(db *gorm.DB) error {
	log.Println("  → Importing map textures...")

	data, err := os.ReadFile("./data/map_textures.json")
	if err != nil {
		return err
	}

	var imports []MapTextureImport
	if err := json.Unmarshal(data, &imports); err != nil {
		return err
	}

	textures := make([]models.MapTexture, len(imports))
	now := time.Now()

	for i, imp := range imports {
		textures[i] = models.MapTexture{
			PlanningAreaID: imp.PlanningAreaID,
			PNGFilePath:    imp.PNGFilePath,
			BoundsMinLat:   imp.BoundsMinLat,
			BoundsMaxLat:   imp.BoundsMaxLat,
			BoundsMinLng:   imp.BoundsMinLng,
			BoundsMaxLng:   imp.BoundsMaxLng,
			CreatedAt:      now,
		}
	}

	if err := db.Create(&textures).Error; err != nil {
		return err
	}

	log.Printf("    ✓ Imported %d map textures", len(textures))
	return nil
}
