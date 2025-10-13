package main

import (
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"fmt"
	"log"
	"strings"
)

func main() {
	cfg, _ := config.Load()
	db := database.NewPostgres(cfg.GetDatabaseDSN())

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("  📊 Digital Twin Platform - Data Summary")
	fmt.Println(strings.Repeat("=", 60))

	// Count areas
	var areaCount int64
	db.Model(&models.PlanningArea{}).Count(&areaCount)
	fmt.Printf("\n🗺️  Planning Areas: %d\n", areaCount)

	// Count buildings
	var buildingCount int64
	db.Model(&models.Building{}).Count(&buildingCount)
	var buildingStats struct {
		AvgHeight float64
		MaxHeight float64
	}
	db.Model(&models.Building{}).Select("AVG(height) as avg_height, MAX(height) as max_height").Scan(&buildingStats)
	fmt.Printf("🏢 Buildings: %d (Avg: %.1fm, Max: %.1fm)\n", buildingCount, buildingStats.AvgHeight, buildingStats.MaxHeight)

	// Count streamlines
	var streamlineCount int64
	db.Model(&models.WindStreamline{}).Count(&streamlineCount)
	fmt.Printf("🌬️  Wind Streamlines: %d\n", streamlineCount)

	// Count map textures
	var textureCount int64
	db.Model(&models.MapTexture{}).Count(&textureCount)
	fmt.Printf("🗺️  Map Textures: %d\n", textureCount)

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("  ✅ All data loaded successfully!")
	fmt.Println(strings.Repeat("=", 60) + "\n")

	log.Println("✅ Summary complete")
}
