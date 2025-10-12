package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"digitwin-backend/internal/models"
)

// BuildingRepository handles data access for buildings
type BuildingRepository struct {
	db    *gorm.DB
	cache *redis.Client
}

// NewBuildingRepository creates a new building repository
func NewBuildingRepository(db *gorm.DB, cache *redis.Client) *BuildingRepository {
	return &BuildingRepository{db: db, cache: cache}
}

// GetByAreaID retrieves all buildings for a planning area
func (r *BuildingRepository) GetByAreaID(ctx context.Context, areaID string) ([]models.Building, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("buildings:%s", areaID)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var buildings []models.Building
		if err := json.Unmarshal([]byte(cached), &buildings); err == nil {
			return buildings, nil
		}
	}

	// Query database
	var buildings []models.Building
	if err := r.db.Where("planning_area_id = ?", areaID).Find(&buildings).Error; err != nil {
		return nil, fmt.Errorf("failed to query buildings: %w", err)
	}

	// Cache for 1 hour
	data, _ := json.Marshal(buildings)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return buildings, nil
}

// ChunkInfo represents metadata about building chunks
type ChunkInfo struct {
	TotalChunks int `json:"total_chunks"`
	ChunkSize   int `json:"chunk_size"`
	TotalCount  int `json:"total_count"`
}

// GetChunkInfo retrieves chunk metadata for an area
func (r *BuildingRepository) GetChunkInfo(ctx context.Context, areaID string) (*ChunkInfo, error) {
	var count int64
	if err := r.db.Model(&models.Building{}).
		Where("planning_area_id = ?", areaID).
		Count(&count).Error; err != nil {
		return nil, err
	}

	chunkSize := 100
	totalChunks := int(math.Ceil(float64(count) / float64(chunkSize)))

	return &ChunkInfo{
		TotalChunks: totalChunks,
		ChunkSize:   chunkSize,
		TotalCount:  int(count),
	}, nil
}

// GetChunk retrieves a specific chunk of buildings
func (r *BuildingRepository) GetChunk(ctx context.Context, areaID string, chunkID int) ([]models.Building, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("buildings:%s:chunk:%d", areaID, chunkID)
	cached, err := r.cache.Get(ctx, cacheKey).Result()
	if err == nil {
		var buildings []models.Building
		if err := json.Unmarshal([]byte(cached), &buildings); err == nil {
			return buildings, nil
		}
	}

	// Query database
	var buildings []models.Building
	offset := chunkID * 100
	if err := r.db.Where("planning_area_id = ?", areaID).
		Offset(offset).
		Limit(100).
		Find(&buildings).Error; err != nil {
		return nil, err
	}

	// Cache for 1 hour
	data, _ := json.Marshal(buildings)
	r.cache.Set(ctx, cacheKey, data, time.Hour)

	return buildings, nil
}

// Create creates a new building
func (r *BuildingRepository) Create(ctx context.Context, building *models.Building) error {
	return r.db.WithContext(ctx).Create(building).Error
}

// BatchCreate creates multiple buildings
func (r *BuildingRepository) BatchCreate(ctx context.Context, buildings []models.Building) error {
	return r.db.WithContext(ctx).CreateInBatches(buildings, 1000).Error
}
