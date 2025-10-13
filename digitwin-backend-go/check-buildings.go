package main

import (
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"fmt"
	"log"
)

func main() {
	cfg, _ := config.Load()
	db := database.NewPostgres(cfg.GetDatabaseDSN())

	var count int64
	db.Model(&models.Building{}).Count(&count)

	var stats struct {
		AvgHeight float64
		MaxHeight float64
		MinHeight float64
	}
	db.Model(&models.Building{}).Select("AVG(height) as avg_height, MAX(height) as max_height, MIN(height) as min_height").Scan(&stats)

	fmt.Println("\n📊 Building Statistics:")
	fmt.Printf("Total buildings: %d\n", count)
	fmt.Printf("Height - Avg: %.2fm, Max: %.2fm, Min: %.2fm\n", stats.AvgHeight, stats.MaxHeight, stats.MinHeight)

	// Count by area
	type AreaCount struct {
		PlanningAreaID string
		Count          int64
	}
	var areaCounts []AreaCount
	db.Model(&models.Building{}).
		Select("planning_area_id, COUNT(*) as count").
		Group("planning_area_id").
		Order("count DESC").
		Limit(10).
		Scan(&areaCounts)

	fmt.Println("\n🏗️ Top 10 Areas by Building Count:")
	for _, ac := range areaCounts {
		fmt.Printf("  %s: %d buildings\n", ac.PlanningAreaID, ac.Count)
	}

	log.Println("✅ Check complete")
}
