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
