package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"digitwin-backend/internal/models"
)

// MapTextureRepository handles data access for map textures
type MapTextureRepository struct {
	db    *gorm.DB
	cache *redis.Client
}

// NewMapTextureRepository creates a new map texture repository
func NewMapTextureRepository(db *gorm.DB, cache *redis.Client) *MapTextureRepository {
	return &MapTextureRepository{db: db, cache: cache}
}

// GetByAreaID retrieves map texture metadata for a planning area
func (r *MapTextureRepository) GetByAreaID(ctx context.Context, areaID string) (*models.MapTexture, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("map_texture:%s", areaID)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var texture models.MapTexture
		if err := json.Unmarshal([]byte(cached), &texture); err == nil {
			return &texture, nil
		}
	}

	// Query database
	var texture models.MapTexture
	if err := r.db.Where("planning_area_id = ?", areaID).First(&texture).Error; err != nil {
		return nil, fmt.Errorf("map texture not found: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(texture)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return &texture, nil
}

// Create creates a new map texture
func (r *MapTextureRepository) Create(ctx context.Context, texture *models.MapTexture) error {
	return r.db.WithContext(ctx).Create(texture).Error
}

// BatchCreate creates multiple map textures
func (r *MapTextureRepository) BatchCreate(ctx context.Context, textures []models.MapTexture) error {
	return r.db.WithContext(ctx).CreateInBatches(textures, 100).Error
}

// Update updates a map texture
func (r *MapTextureRepository) Update(ctx context.Context, texture *models.MapTexture) error {
	// Clear cache
	r.cache.Del(ctx, fmt.Sprintf("map_texture:%s", texture.PlanningAreaID))
	return r.db.WithContext(ctx).Save(texture).Error
}

// DeleteByAreaID deletes a map texture by area ID
func (r *MapTextureRepository) DeleteByAreaID(ctx context.Context, areaID string) error {
	// Clear cache
	r.cache.Del(ctx, fmt.Sprintf("map_texture:%s", areaID))
	return r.db.WithContext(ctx).Where("planning_area_id = ?", areaID).Delete(&models.MapTexture{}).Error
}
