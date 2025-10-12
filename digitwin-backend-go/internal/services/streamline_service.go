// Streamline Service - Business logic for wind streamlines
package services

import (
	"context"
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/repositories"
	"digitwin-backend/pkg/errors"
	"fmt"
)

type StreamlineService struct {
	streamlineRepo *repositories.StreamlineRepository
	areaRepo       *repositories.AreaRepository
}

func NewStreamlineService(streamlineRepo *repositories.StreamlineRepository, areaRepo *repositories.AreaRepository) *StreamlineService {
	return &StreamlineService{
		streamlineRepo: streamlineRepo,
		areaRepo:       areaRepo,
	}
}

// GetStreamlinesByAreaAndDirection retrieves streamlines for a specific area and direction
func (s *StreamlineService) GetStreamlinesByAreaAndDirection(ctx context.Context, areaID string, direction string) ([]models.WindStreamline, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	// Validate direction
	validDirections := map[string]bool{
		"N": true, "NE": true, "E": true, "SE": true,
		"S": true, "SW": true, "W": true, "NW": true,
	}
	if direction != "" && !validDirections[direction] {
		return nil, errors.NewSimpleValidationError("invalid direction: must be one of N, NE, E, SE, S, SW, W, NW")
	}

	// Verify area exists
	area, err := s.areaRepo.GetByID(ctx, areaID)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to verify area exists", err)
	}
	if area == nil {
		return nil, errors.NewNotFoundError("planning area", areaID)
	}

	streamlines, err := s.streamlineRepo.GetByAreaAndDirection(ctx, areaID, direction)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get streamlines", err)
	}

	return streamlines, nil
}

// GetAllStreamlinesByArea retrieves all streamlines for a planning area
func (s *StreamlineService) GetAllStreamlinesByArea(ctx context.Context, areaID string) ([]models.WindStreamline, error) {
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

	streamlines, err := s.streamlineRepo.GetByAreaAndDirection(ctx, areaID, "")
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get streamlines", err)
	}

	return streamlines, nil
}

// CreateStreamlines creates multiple streamlines in a batch
func (s *StreamlineService) CreateStreamlines(ctx context.Context, streamlines []models.WindStreamline) error {
	if len(streamlines) == 0 {
		return errors.NewSimpleValidationError("no streamlines to create")
	}

	validDirections := map[string]bool{
		"N": true, "NE": true, "E": true, "SE": true,
		"S": true, "SW": true, "W": true, "NW": true,
	}

	// Validate all streamlines
	for i, streamline := range streamlines {
		if streamline.PlanningAreaID == "" {
			return errors.NewSimpleValidationError(fmt.Sprintf("streamline[%d]: planning area ID cannot be empty", i))
		}
		if !validDirections[streamline.Direction] {
			return errors.NewSimpleValidationError(fmt.Sprintf("streamline[%d]: invalid direction %s", i, streamline.Direction))
		}
		if len(streamline.Points) < 2 {
			return errors.NewSimpleValidationError(fmt.Sprintf("streamline[%d]: must have at least 2 points", i))
		}
	}

	// Verify all referenced areas exist (unique area IDs)
	areaIDs := make(map[string]bool)
	for _, streamline := range streamlines {
		areaIDs[streamline.PlanningAreaID] = true
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

	// Batch create streamlines
	if err := s.streamlineRepo.CreateBatch(ctx, streamlines); err != nil {
		return errors.NewDatabaseError("failed to create streamlines", err)
	}

	return nil
}

// DeleteStreamlinesByAreaID deletes all streamlines for a planning area
func (s *StreamlineService) DeleteStreamlinesByAreaID(ctx context.Context, areaID string) error {
	if areaID == "" {
		return errors.NewSimpleValidationError("area ID cannot be empty")
	}

	if err := s.streamlineRepo.DeleteByAreaID(ctx, areaID); err != nil {
		return errors.NewDatabaseError("failed to delete streamlines", err)
	}

	return nil
}

// GetStreamlineStats returns statistics about streamlines
func (s *StreamlineService) GetStreamlineStats(ctx context.Context, areaID string) (map[string]interface{}, error) {
	if areaID == "" {
		return nil, errors.NewSimpleValidationError("area ID cannot be empty")
	}

	streamlines, err := s.streamlineRepo.GetByAreaAndDirection(ctx, areaID, "")
	if err != nil {
		return nil, errors.NewDatabaseError("failed to get streamlines", err)
	}

	if len(streamlines) == 0 {
		return map[string]interface{}{
			"count":            0,
			"byDirection":      map[string]int{},
			"avgPointsPerLine": 0,
			"totalPoints":      0,
		}, nil
	}

	// Calculate statistics
	byDirection := make(map[string]int)
	totalPoints := 0

	for _, streamline := range streamlines {
		byDirection[streamline.Direction]++
		totalPoints += len(streamline.Points)
	}

	return map[string]interface{}{
		"count":            len(streamlines),
		"byDirection":      byDirection,
		"avgPointsPerLine": float64(totalPoints) / float64(len(streamlines)),
		"totalPoints":      totalPoints,
	}, nil
}
