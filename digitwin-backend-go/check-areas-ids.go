package main

import (
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/models"
	"fmt"
)

func main() {
	cfg, _ := config.Load()
	db := database.NewPostgres(cfg.GetDatabaseDSN())

	var areas []models.PlanningArea
	db.Select("id, name").Find(&areas)

	fmt.Printf("Found %d planning areas:\n", len(areas))
	for _, area := range areas {
		fmt.Printf("  - %s (%s)\n", area.Name, area.ID)
	}
}
