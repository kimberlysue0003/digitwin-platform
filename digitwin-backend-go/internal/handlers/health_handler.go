// Health Handler - Health check endpoint
package handlers

import (
	"context"
	"digitwin-backend/pkg/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db    *gorm.DB
	cache *redis.Client
}

func NewHealthHandler(db *gorm.DB, cache *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		cache: cache,
	}
}

// HealthCheck godoc
// @Summary Health check endpoint
// @Tags health
// @Produce json
// @Success 200 {object} response.Response{data=map[string]interface{}}
// @Failure 503 {object} response.Response
// @Router /health [get]
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	health := gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
	}

	// Check database connection
	sqlDB, err := h.db.DB()
	if err != nil {
		health["status"] = "unhealthy"
		health["database"] = gin.H{"status": "error", "message": err.Error()}
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		health["status"] = "unhealthy"
		health["database"] = gin.H{"status": "error", "message": err.Error()}
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	health["database"] = gin.H{"status": "healthy"}

	// Check Redis connection
	if err := h.cache.Ping(ctx).Err(); err != nil {
		health["status"] = "unhealthy"
		health["redis"] = gin.H{"status": "error", "message": err.Error()}
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	health["redis"] = gin.H{"status": "healthy"}

	response.Success(c, health)
}

// ReadyCheck godoc
// @Summary Readiness check endpoint (for Kubernetes)
// @Tags health
// @Produce json
// @Success 200 {object} response.Response
// @Failure 503 {object} response.Response
// @Router /ready [get]
func (h *HealthHandler) ReadyCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Check database
	sqlDB, err := h.db.DB()
	if err != nil {
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	// Check Redis
	if err := h.cache.Ping(ctx).Err(); err != nil {
		response.Error(c, http.StatusServiceUnavailable, err)
		return
	}

	response.Success(c, gin.H{"ready": true})
}

// LiveCheck godoc
// @Summary Liveness check endpoint (for Kubernetes)
// @Tags health
// @Produce json
// @Success 200 {object} response.Response
// @Router /live [get]
func (h *HealthHandler) LiveCheck(c *gin.Context) {
	response.Success(c, gin.H{"alive": true})
}
