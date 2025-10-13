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

	fmt.Println("\n📊 Streamline Statistics:")
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

	log.Println("✅ Check complete")
}
