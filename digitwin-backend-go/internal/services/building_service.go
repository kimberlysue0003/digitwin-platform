// Building Service - Business logic for buildings
package services

import (
	"context"
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/repositories"
	"digitwin-backend/pkg/errors"
	"fmt"
)

type BuildingService struct {
	buildingRepo *repositories.BuildingRepository
	areaRepo     *repositories.AreaRepository
}

func NewBuildingService(buildingRepo *repositories.BuildingRepository, areaRepo *repositories.AreaRepository) *BuildingService {
	return &BuildingService{
		buildingRepo: buildingRepo,
		areaRepo:     areaRepo,
	}
}

// GetBuildingsByAreaID retrieves all buildings for a planning area
func (s *BuildingService) GetBuildingsByAreaID(ctx context.Context, areaID string) ([]models.Building, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Verify area exists
	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to verify area exists", err)
	}
	if area == nil {
		return nil, errors.NewNotFoundError("planning area", areaID)
	}

	buildings, err := s.buildingRepo.GetByAreaID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get buildings", err)
	}

	return buildings, nil
}

// GetBuildingChunkInfo retrieves chunk information for a planning area
func (s *BuildingService) GetBuildingChunkInfo(ctx context.Context, areaID string) (*repositories.ChunkInfo, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Verify area exists
	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to verify area exists", err)
	}
	if area == nil {
		return nil, errors.NewNotFoundError("planning area", areaID)
	}

	chunkInfo, err := s.buildingRepo.GetChunkInfo(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get chunk info", err)
	}

	return chunkInfo, nil
}

// GetBuildingChunk retrieves a specific chunk of buildings
func (s *BuildingService) GetBuildingChunk(ctx context.Context, areaID string, chunkIndex int) ([]models.Building, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	if chunkIndex < 0 {
		return nil, errors.NewSimpleValidationError("chunk index must be non-negative")
	}

	// Verify area exists
	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to verify area exists", err)
	}
	if area == nil {
		return nil, errors.NewNotFoundError("planning area", areaID)
	}

	// Get chunk info to validate chunk index
	chunkInfo, err := s.buildingRepo.GetChunkInfo(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get chunk info", err)
	}

	if chunkIndex >= chunkInfo.TotalChunks {
		return nil, errors.NewSimpleValidationError(fmt.Sprintf("chunk index %d out of range (total chunks: %d)", chunkIndex, chunkInfo.TotalChunks))
	}

	buildings, err := s.buildingRepo.GetChunk(ctx, areaID, chunkIndex)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get building chunk", err)
	}

	return buildings, nil
}

// CreateBuildings creates multiple buildings in a batch
func (s *BuildingService) CreateBuildings(ctx context.Context, buildings []models.Building) error {
	if len(buildings) == 0 {
		return errors.NewSimpleValidationError("no buildings to create")
	}

	// Validate all buildings
	for i, building := range buildings {
		if building.PlanningAreaID == "" {
			return errors.NewSimpleValidationError(fmt.Sprintf("building[%d]: planning area ID cannot be empty", i))
		}
		if len(building.Footprint) < 3 {
			return errors.NewSimpleValidationError(fmt.Sprintf("building[%d]: footprint must have at least 3 points", i))
		}
		if building.Height <= 0 {
			return errors.NewSimpleValidationError(fmt.Sprintf("building[%d]: height must be positive", i))
		}
	}

	// Verify all referenced areas exist (unique area IDs)
	areaIDs := make(map[string]bool)
	for _, building := range buildings {
		areaIDs[building.PlanningAreaID] = true
	}

	for areaID := range areaIDs {
		area, err := s.areaRepo.GetByID(ctx, areaID)
		if err != nil {
			return errors.NewDatabaseError(fmt.Sprintf("failed to verify area %s exists", areaID), err)
		}
		if area == nil {
			return errors.NewNotFoundError("planning area", areaID)
		}
	}

	// Batch create buildings
	if err := s.buildingRepo.CreateBatch(ctx, buildings); err != nil {
		return errors.NewDatabaseError("failed to create buildings", err)
	}

	return nil
}

// DeleteBuildingsByAreaID deletes all buildings for a planning area
func (s *BuildingService) DeleteBuildingsByAreaID(ctx context.Context, areaID string) error {
	if areaID == "" {
		return errors.NewSimpleValidationError("area ID cannot be empty")
	}

	if err := s.buildingRepo.DeleteByAreaID(ctx, areaID); err != nil {
		return errors.NewDatabaseError("failed to delete buildings", err)
	}

	return nil
}

// GetBuildingStats returns statistics about buildings
func (s *BuildingService) GetBuildingStats(ctx context.Context, areaID string) (map[string]interface{}, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	buildings, err := s.buildingRepo.GetByAreaID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get buildings", err)
	}

	if len(buildings) == 0 {
		return map[string]interface{}{
			"count":      0,
			"avgHeight":  0,
			"maxHeight":  0,
			"minHeight":  0,
			"totalArea":  0,
		}, nil
	}

	// Calculate statistics
	var totalHeight float64
	maxHeight := buildings[0].Height
	minHeight := buildings[0].Height
	var totalArea float64

	for _, building := range buildings {
		totalHeight += building.Height
		if building.Height > maxHeight {
			maxHeight = building.Height
		}
		if building.Height < minHeight {
			minHeight = building.Height
		}

		// Calculate footprint area (simple polygon area calculation)
		area := calculatePolygonArea(building.Footprint)
		totalArea += area
	}

	return map[string]interface{}{
		"count":      len(buildings),
		"avgHeight":  totalHeight / float64(len(buildings)),
		"maxHeight":  maxHeight,
		"minHeight":  minHeight,
		"totalArea":  totalArea,
	}, nil
}

// calculatePolygonArea calculates the area of a polygon using the shoelace formula
func calculatePolygonArea(points models.Footprint) float64 {
	if len(points) < 3 {
		return 0
	}

	var area float64
	for i := 0; i < len(points); i++ {
		j := (i + 1) % len(points)
		area += points[i].X * points[j].Z
		area -= points[j].X * points[i].Z
	}

	return abs(area) / 2.0
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
