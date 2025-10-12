package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kimberlysue0003/digitwin-backend-go/internal/models"
)

// StreamlineRepository handles data access for wind streamlines
type StreamlineRepository struct {
	db    *gorm.DB
	cache *redis.Client
}

// NewStreamlineRepository creates a new streamline repository
func NewStreamlineRepository(db *gorm.DB, cache *redis.Client) *StreamlineRepository {
	return &StreamlineRepository{db: db, cache: cache}
}

// GetByAreaID retrieves all wind streamlines for a planning area
func (r *StreamlineRepository) GetByAreaID(ctx context.Context, areaID string) ([]models.WindStreamline, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("streamlines:%s", areaID)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var streamlines []models.WindStreamline
		if err := json.Unmarshal([]byte(cached), &streamlines); err == nil {
			return streamlines, nil
		}
	}

	// Query database
	var streamlines []models.WindStreamline
	if err := r.db.Where("planning_area_id = ?", areaID).Find(&streamlines).Error; err != nil {
		return nil, fmt.Errorf("failed to query streamlines: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(streamlines)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return streamlines, nil
}

// Create creates a new wind streamline
func (r *StreamlineRepository) Create(ctx context.Context, streamline *models.WindStreamline) error {
	return r.db.WithContext(ctx).Create(streamline).Error
}

// BatchCreate creates multiple wind streamlines
func (r *StreamlineRepository) BatchCreate(ctx context.Context, streamlines []models.WindStreamline) error {
	return r.db.WithContext(ctx).CreateInBatches(streamlines, 1000).Error
}
