// MapTexture Service - Business logic for map textures
package services

import (
	"context"
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/repositories"
	"digitwin-backend/pkg/errors"
	"fmt"
	"os"
	"path/filepath"
)

type MapTextureService struct {
	mapTextureRepo *repositories.MapTextureRepository
	areaRepo       *repositories.AreaRepository
	staticPath     string
}

func NewMapTextureService(mapTextureRepo *repositories.MapTextureRepository, areaRepo *repositories.AreaRepository, staticPath string) *MapTextureService {
	return &MapTextureService{
		mapTextureRepo: mapTextureRepo,
		areaRepo:       areaRepo,
		staticPath:     staticPath,
	}
}

// GetMapTextureByAreaID retrieves map texture metadata for a planning area
func (s *MapTextureService) GetMapTextureByAreaID(ctx context.Context, areaID string) (*models.MapTexture, error) {
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

	mapTexture, err := s.mapTextureRepo.GetByAreaID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get map texture", err)
	}
	if mapTexture == nil {
		return nil, errors.NewNotFoundError("map texture", areaID)
	}

	return mapTexture, nil
}

// CreateMapTexture creates a new map texture entry
func (s *MapTextureService) CreateMapTexture(ctx context.Context, mapTexture *models.MapTexture) error {
	// Validate required fields
	if mapTexture.PlanningAreaID == "" {
		return errors.NewSimpleValidationError("planning area ID cannot be empty")
	}
	if mapTexture.PNGFilePath == "" {
		return errors.NewSimpleValidationError("PNG file path cannot be empty")
	}

	// Verify area exists
	area, err := s.areaRepo.GetByID(ctx, mapTexture.PlanningAreaID)
	if err != nil {
		return errors.NewDatabaseError("failed to verify area exists", err)
	}
	if area == nil {
		return errors.NewNotFoundError("planning area", mapTexture.PlanningAreaID)
	}

	// Validate bounds
	if mapTexture.BoundsMinLat >= mapTexture.BoundsMaxLat || mapTexture.BoundsMinLng >= mapTexture.BoundsMaxLng {
		return errors.NewSimpleValidationError("invalid bounds: min must be less than max")
	}

	// Check if file exists
	fullPath := filepath.Join(s.staticPath, mapTexture.PNGFilePath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return errors.NewValidationError(fmt.Sprintf("PNG file does not exist: %s", mapTexture.PNGFilePath))
	}

	// Check if map texture already exists for this area
	existing, err := s.mapTextureRepo.GetByAreaID(ctx, mapTexture.PlanningAreaID)
	if err != nil {
		return errors.NewDatabaseError("failed to check existing map texture", err)
	}
	if existing != nil {
		return errors.NewValidationError(fmt.Sprintf("map texture already exists for area %s", mapTexture.PlanningAreaID))
	}

	if err := s.mapTextureRepo.Create(ctx, mapTexture); err != nil {
		return errors.NewDatabaseError("failed to create map texture", err)
	}

	return nil
}

// UpdateMapTexture updates an existing map texture
func (s *MapTextureService) UpdateMapTexture(ctx context.Context, mapTexture *models.MapTexture) error {
	if mapTexture.PlanningAreaID == "" {
		return errors.NewSimpleValidationError("planning area ID cannot be empty")
	}

	// Verify map texture exists
	existing, err := s.mapTextureRepo.GetByAreaID(ctx, mapTexture.PlanningAreaID)
	if err != nil {
		return errors.NewDatabaseError("failed to verify map texture exists", err)
	}
	if existing == nil {
		return errors.NewNotFoundError("map texture", mapTexture.PlanningAreaID)
	}

	// Validate bounds
	if mapTexture.BoundsMinLat >= mapTexture.BoundsMaxLat || mapTexture.BoundsMinLng >= mapTexture.BoundsMaxLng {
		return errors.NewSimpleValidationError("invalid bounds: min must be less than max")
	}

	// Check if file exists (if path is being updated)
	if mapTexture.PNGFilePath != "" {
		fullPath := filepath.Join(s.staticPath, mapTexture.PNGFilePath)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			return errors.NewValidationError(fmt.Sprintf("PNG file does not exist: %s", mapTexture.PNGFilePath))
		}
	}

	if err := s.mapTextureRepo.Update(ctx, mapTexture); err != nil {
		return errors.NewDatabaseError("failed to update map texture", err)
	}

	return nil
}

// DeleteMapTexture deletes a map texture
func (s *MapTextureService) DeleteMapTexture(ctx context.Context, areaID string) error {
	if areaID == "" {
		return errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Verify map texture exists
	existing, err := s.mapTextureRepo.GetByAreaID(ctx, areaID)
	if err != nil {
		return errors.NewDatabaseError("failed to verify map texture exists", err)
	}
	if existing == nil {
		return errors.NewNotFoundError("map texture", areaID)
	}

	if err := s.mapTextureRepo.DeleteByAreaID(ctx, areaID); err != nil {
		return errors.NewDatabaseError("failed to delete map texture", err)
	}

	return nil
}

// GetMapTextureFilePath returns the full file path for a map texture
func (s *MapTextureService) GetMapTextureFilePath(ctx context.Context, areaID string) (string, error) {
	mapTexture, err := s.GetMapTextureByAreaID(ctx, areaID)
	if err != nil {
		return "", err
	}

	fullPath := filepath.Join(s.staticPath, mapTexture.PNGFilePath)

	// Verify file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return "", errors.NewNotFoundError("map texture file", fullPath)
	}

	return fullPath, nil
}

// ValidateMapTextureBounds checks if map texture bounds match the planning area bounds
func (s *MapTextureService) ValidateMapTextureBounds(ctx context.Context, areaID string) error {
	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return errors.NewDatabaseError("failed to get planning area", err)
	}
	if area == nil {
		return errors.NewNotFoundError("planning area", areaID)
	}

	mapTexture, err := s.mapTextureRepo.GetByAreaID(ctx, areaID)
	if err != nil {
		return errors.NewDatabaseError("failed to get map texture", err)
	}
	if mapTexture == nil {
		return errors.NewNotFoundError("map texture", areaID)
	}

	// Check if bounds match (with small tolerance for floating point precision)
	tolerance := 0.0001
	if abs64(area.BoundsMinLat-mapTexture.BoundsMinLat) > tolerance ||
		abs64(area.BoundsMaxLat-mapTexture.BoundsMaxLat) > tolerance ||
		abs64(area.BoundsMinLng-mapTexture.BoundsMinLng) > tolerance ||
		abs64(area.BoundsMaxLng-mapTexture.BoundsMaxLng) > tolerance {
		return errors.NewValidationError(fmt.Sprintf("map texture bounds do not match planning area bounds for %s", areaID))
	}

	return nil
}

func abs64(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
