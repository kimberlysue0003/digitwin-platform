// Area Service - Business logic for planning areas
package services

import (
	"context"
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/repositories"
	"digitwin-backend/pkg/errors"
)

type AreaService struct {
	areaRepo *repositories.AreaRepository
}

func NewAreaService(areaRepo *repositories.AreaRepository) *AreaService {
	return &AreaService{
		areaRepo: areaRepo,
	}
}

// GetAllAreas retrieves all planning areas
func (s *AreaService) GetAllAreas(ctx context.Context) ([]models.PlanningArea, error) {
	areas, err := s.areaRepo.GetAll(ctx)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get planning areas", err)
	}
	return areas, nil
}

// GetAreaByID retrieves a single planning area by ID
func (s *AreaService) GetAreaByID(ctx context.Context, areaID string) (*models.PlanningArea, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get planning area", err)
	}
	if area == nil {
		return nil, errors.NewNotFoundError("planning area", areaID)
	}

	return area, nil
}

// GetAreasByRegion retrieves all areas in a specific region
func (s *AreaService) GetAreasByRegion(ctx context.Context, region string) ([]models.PlanningArea, error) {
	validRegions := map[string]bool{
		"central": true,
		"north":   true,
		"south":   true,
		"east":    true,
		"west":    true,
	}

	if !validRegions[region] {
		return nil, errors.NewValidationError("invalid region: must be one of central, north, south, east, west")
	}

	areas, err := s.areaRepo.GetByRegion(ctx, region)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get areas by region", err)
	}

	return areas, nil
}

// CreateArea creates a new planning area
func (s *AreaService) CreateArea(ctx context.Context, area *models.PlanningArea) error {
	// Validate required fields
	if area.ID == "" || area.Name == "" || area.Region == "" {
		return errors.NewValidationError("ID, name, and region are required")
	}

	// Validate bounds
	if area.BoundsMinLat >= area.BoundsMaxLat || area.BoundsMinLng >= area.BoundsMaxLng {
		return errors.NewSimpleValidationError("invalid bounds: min must be less than max")
	}

	if err := s.areaRepo.Create(ctx, area); err != nil {
		return errors.NewDatabaseError("failed to create planning area", err)
	}

	return nil
}

// UpdateArea updates an existing planning area
func (s *AreaService) UpdateArea(ctx context.Context, area *models.PlanningArea) error {
	if area.ID == "" {
		return errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Verify area exists
	existing, err := s.areaRepo.GetByID(ctx, area.ID)
	if err != nil {
		return errors.NewDatabaseError("failed to verify area exists", err)
	}
	if existing == nil {
		return errors.NewNotFoundError("planning area", area.ID)
	}

	if err := s.areaRepo.Update(ctx, area); err != nil {
		return errors.NewDatabaseError("failed to update planning area", err)
	}

	return nil
}

// DeleteArea deletes a planning area
func (s *AreaService) DeleteArea(ctx context.Context, areaID string) error {
	if areaID == "" {
		return errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Verify area exists
	existing, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return errors.NewDatabaseError("failed to verify area exists", err)
	}
	if existing == nil {
		return errors.NewNotFoundError("planning area", areaID)
	}

	if err := s.areaRepo.Delete(ctx, areaID); err != nil {
		return errors.NewDatabaseError("failed to delete planning area", err)
	}

	return nil
}
