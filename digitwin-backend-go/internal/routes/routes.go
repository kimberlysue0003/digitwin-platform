// Routes - API route definitions
package routes

import (
	"digitwin-backend/internal/handlers"
	"digitwin-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type Router struct {
	areaHandler       *handlers.AreaHandler
	buildingHandler   *handlers.BuildingHandler
	streamlineHandler *handlers.StreamlineHandler
	mapTextureHandler *handlers.MapTextureHandler
	healthHandler     *handlers.HealthHandler
	wsHandler         *handlers.WebSocketHandler
	redisClient       *redis.Client
	logger            *zap.Logger
}

func NewRouter(
	areaHandler *handlers.AreaHandler,
	buildingHandler *handlers.BuildingHandler,
	streamlineHandler *handlers.StreamlineHandler,
	mapTextureHandler *handlers.MapTextureHandler,
	healthHandler *handlers.HealthHandler,
	wsHandler *handlers.WebSocketHandler,
	redisClient *redis.Client,
	logger *zap.Logger,
) *Router {
	return &Router{
		areaHandler:       areaHandler,
		buildingHandler:   buildingHandler,
		streamlineHandler: streamlineHandler,
		mapTextureHandler: mapTextureHandler,
		healthHandler:     healthHandler,
		wsHandler:         wsHandler,
		redisClient:       redisClient,
		logger:            logger,
	}
}

func (r *Router) Setup(engine *gin.Engine) {
	// Global middleware
	engine.Use(middleware.CORSMiddleware())
	engine.Use(middleware.LoggerMiddleware(r.logger))
	engine.Use(middleware.RecoveryMiddleware(r.logger))
	// Removed TimeoutMiddleware - let requests complete naturally
	// Building chunk requests can take 5-10 seconds each, 100+ chunks = 10+ minutes total

	// DISABLED: These middleware cause severe performance issues with 100+ parallel chunk requests
	// Each request = 2-4 Redis queries + potential queueing = massive slowdown
	// TODO: Optimize or remove entirely

	// concurrencyLimiter := middleware.NewConcurrencyLimiter(100)
	// engine.Use(middleware.ConcurrencyLimitMiddleware(concurrencyLimiter))

	// redisRateLimiter := middleware.NewRedisRateLimiter(r.redisClient, 5000, time.Second)
	// engine.Use(middleware.RedisRateLimitMiddleware(redisRateLimiter))

	// Health check endpoints (no /api prefix)
	engine.GET("/health", r.healthHandler.HealthCheck)
	engine.GET("/ready", r.healthHandler.ReadyCheck)
	engine.GET("/live", r.healthHandler.LiveCheck)

	// WebSocket endpoint (no /api prefix, no middleware)
	engine.GET("/ws", r.wsHandler.HandleWebSocket)

	// API routes
	api := engine.Group("/api")
	{
		// Planning Areas
		areas := api.Group("/areas")
		{
			areas.GET("", r.areaHandler.GetAllAreas)
			areas.GET("/:id", r.areaHandler.GetAreaByID)
			areas.GET("/region/:region", r.areaHandler.GetAreasByRegion)
			areas.POST("", r.areaHandler.CreateArea)
			areas.PUT("/:id", r.areaHandler.UpdateArea)
			areas.DELETE("/:id", r.areaHandler.DeleteArea)
		}

		// Buildings
		buildings := api.Group("/buildings")
		{
			buildings.GET("/:areaId", r.buildingHandler.GetBuildingsByAreaID)
			buildings.GET("/:areaId/chunks/info", r.buildingHandler.GetBuildingChunkInfo)
			buildings.GET("/:areaId/chunks/:chunkIndex", r.buildingHandler.GetBuildingChunk)
			buildings.GET("/:areaId/stats", r.buildingHandler.GetBuildingStats)
			buildings.POST("", r.buildingHandler.CreateBuildings)
			buildings.DELETE("/:areaId", r.buildingHandler.DeleteBuildingsByAreaID)
		}

		// Wind Streamlines
		streamlines := api.Group("/streamlines")
		{
			streamlines.GET("/:areaId", r.streamlineHandler.GetStreamlinesByAreaAndDirection)
			streamlines.GET("/:areaId/all", r.streamlineHandler.GetAllStreamlinesByArea)
			streamlines.GET("/:areaId/stats", r.streamlineHandler.GetStreamlineStats)
			streamlines.POST("", r.streamlineHandler.CreateStreamlines)
			streamlines.DELETE("/:areaId", r.streamlineHandler.DeleteStreamlinesByAreaID)
		}

		// Map Textures
		mapTextures := api.Group("/map-textures")
		{
			mapTextures.GET("/:areaId", r.mapTextureHandler.GetMapTextureByAreaID)
			mapTextures.GET("/:areaId/file", r.mapTextureHandler.GetMapTextureFile)
			mapTextures.GET("/:areaId/validate", r.mapTextureHandler.ValidateMapTextureBounds)
			mapTextures.POST("", r.mapTextureHandler.CreateMapTexture)
			mapTextures.PUT("/:areaId", r.mapTextureHandler.UpdateMapTexture)
			mapTextures.DELETE("/:areaId", r.mapTextureHandler.DeleteMapTexture)
		}

		// WebSocket Stats
		ws := api.Group("/ws")
		{
			ws.GET("/stats", r.wsHandler.GetWebSocketStats)
		}
	}
}
