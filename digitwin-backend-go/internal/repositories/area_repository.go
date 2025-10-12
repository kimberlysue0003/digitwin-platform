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

// AreaRepository handles data access for planning areas
type AreaRepository struct {
	db    *gorm.DB
	cache *redis.Client
}

// NewAreaRepository creates a new area repository
func NewAreaRepository(db *gorm.DB, cache *redis.Client) *AreaRepository {
	return &AreaRepository{db: db, cache: cache}
}

// GetAll retrieves all planning areas
func (r *AreaRepository) GetAll(ctx context.Context) ([]models.PlanningArea, error) {
	// Try cache first
	cacheKey := "areas:all"
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var areas []models.PlanningArea
		if err := json.Unmarshal([]byte(cached), &areas); err == nil {
			return areas, nil
		}
	}

	// Query database
	var areas []models.PlanningArea
	if err := r.db.Find(&areas).Error; err != nil {
		return nil, fmt.Errorf("failed to query areas: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(areas)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return areas, nil
}

// GetByID retrieves a planning area by ID
func (r *AreaRepository) GetByID(ctx context.Context, id string) (*models.PlanningArea, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("area:%s", id)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var area models.PlanningArea
		if err := json.Unmarshal([]byte(cached), &area); err == nil {
			return &area, nil
		}
	}

	// Query database
	var area models.PlanningArea
	if err := r.db.Where("id = ?", id).First(&area).Error; err != nil {
		return nil, fmt.Errorf("area not found: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(area)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return &area, nil
}

// Create creates a new planning area
func (r *AreaRepository) Create(ctx context.Context, area *models.PlanningArea) error {
	return r.db.WithContext(ctx).Create(area).Error
}

// BatchCreate creates multiple planning areas
func (r *AreaRepository) BatchCreate(ctx context.Context, areas []models.PlanningArea) error {
	return r.db.WithContext(ctx).CreateInBatches(areas, 100).Error
}

// GetByRegion retrieves planning areas by region
func (r *AreaRepository) GetByRegion(ctx context.Context, region string) ([]models.PlanningArea, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("areas:region:%s", region)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var areas []models.PlanningArea
		if err := json.Unmarshal([]byte(cached), &areas); err == nil {
			return areas, nil
		}
	}

	// Query database
	var areas []models.PlanningArea
	if err := r.db.Where("region = ?", region).Find(&areas).Error; err != nil {
		return nil, fmt.Errorf("failed to query areas by region: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(areas)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return areas, nil
}

// Update updates a planning area
func (r *AreaRepository) Update(ctx context.Context, area *models.PlanningArea) error {
	// Clear cache
	r.cache.Del(ctx, "areas:all")
	r.cache.Del(ctx, fmt.Sprintf("area:%s", area.ID))
	r.cache.Del(ctx, fmt.Sprintf("areas:region:%s", area.Region))

	return r.db.WithContext(ctx).Save(area).Error
}

// Delete deletes a planning area
func (r *AreaRepository) Delete(ctx context.Context, id string) error {
	// Get area to clear region cache
	var area models.PlanningArea
	if err := r.db.Where("id = ?", id).First(&area).Error; err == nil {
		r.cache.Del(ctx, fmt.Sprintf("areas:region:%s", area.Region))
	}

	// Clear cache
	r.cache.Del(ctx, "areas:all")
	r.cache.Del(ctx, fmt.Sprintf("area:%s", id))

	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.PlanningArea{}).Error
}
