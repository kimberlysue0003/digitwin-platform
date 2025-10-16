// Main entry point for DigitWin Backend API
package main

import (
	"context"
	"digitwin-backend/internal/config"
	"digitwin-backend/internal/database"
	"digitwin-backend/internal/handlers"
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/repositories"
	"digitwin-backend/internal/routes"
	"digitwin-backend/internal/services"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger := initLogger(cfg.App.LogLevel)
	defer logger.Sync()

	logger.Info("Starting DigitWin Backend API",
		zap.String("version", "1.0.0"),
		zap.String("mode", cfg.Server.Mode),
	)

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Initialize database
	db := database.NewPostgres(cfg.GetDatabaseDSN())
	logger.Info("Database connected", zap.String("host", cfg.Database.Host))

	// Drop foreign key constraint on map_textures if exists
	// This is needed because map_textures uses real area IDs (ang-mo-kio)
	// while planning_areas may have test data (area-a-1)
	db.Exec("ALTER TABLE map_textures DROP CONSTRAINT IF EXISTS fk_planning_areas_map_texture")

	// Auto-migrate database tables
	if err := db.AutoMigrate(
		&models.PlanningArea{},
		&models.Building{},
		&models.WindStreamline{},
		&models.MapTexture{},
	); err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	}

	// Drop foreign key constraint again after AutoMigrate
	// GORM tries to add it back during migration
	db.Exec("ALTER TABLE map_textures DROP CONSTRAINT IF EXISTS fk_planning_areas_map_texture")

	logger.Info("Database tables migrated successfully")

	// Seed database if empty
	if err := database.SeedDatabase(db); err != nil {
		logger.Fatal("Failed to seed database", zap.Error(err))
	}

	// Initialize Redis (optional)
	var redisClient *redis.Client
	redisClient = redis.NewClient(&redis.Options{
		Addr:     cfg.GetRedisAddr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	// Test Redis connection (non-fatal if fails)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis connection failed, running without cache", zap.Error(err))
		redisClient = nil
	} else {
		logger.Info("Redis connected", zap.String("host", cfg.Redis.Host))
	}

	// Initialize repositories
	areaRepo := repositories.NewAreaRepository(db, redisClient)
	buildingRepo := repositories.NewBuildingRepository(db, redisClient)
	streamlineRepo := repositories.NewStreamlineRepository(db, redisClient)
	mapTextureRepo := repositories.NewMapTextureRepository(db, redisClient)

	// Initialize services
	areaService := services.NewAreaService(areaRepo)
	buildingService := services.NewBuildingService(buildingRepo, areaRepo)
	streamlineService := services.NewStreamlineService(streamlineRepo, areaRepo)
	mapTextureService := services.NewMapTextureService(mapTextureRepo, areaRepo, cfg.App.StaticPath)
	wsService := services.NewWebSocketService(areaRepo, buildingRepo, streamlineRepo)

	// Initialize handlers
	areaHandler := handlers.NewAreaHandler(areaService)
	buildingHandler := handlers.NewBuildingHandler(buildingService)
	streamlineHandler := handlers.NewStreamlineHandler(streamlineService)
	mapTextureHandler := handlers.NewMapTextureHandler(mapTextureService)
	healthHandler := handlers.NewHealthHandler(db, redisClient)
	wsHandler := handlers.NewWebSocketHandler(wsService)

	logger.Info("WebSocket service initialized")

	// Initialize router
	engine := gin.New()

	// Apply CORS middleware first (before static files)
	engine.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Serve static files
	engine.Static("/static", cfg.App.StaticPath)

	router := routes.NewRouter(
		areaHandler,
		buildingHandler,
		streamlineHandler,
		mapTextureHandler,
		healthHandler,
		wsHandler,
		redisClient,
		logger,
	)
	router.Setup(engine)

	// Create HTTP server with production-ready timeouts
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	server := &http.Server{
		Addr:              addr,
		Handler:           engine,
		ReadTimeout:       15 * time.Second,  // Time to read request (including body)
		ReadHeaderTimeout: 5 * time.Second,   // Time to read request headers only
		WriteTimeout:      15 * time.Second,  // Time to write response
		IdleTimeout:       120 * time.Second, // Keep-alive idle timeout
		MaxHeaderBytes:    1 << 20,           // 1 MB max header size
	}

	// Start server in goroutine
	go func() {
		logger.Info("Server starting", zap.String("address", addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Server shutting down...")

	// Graceful shutdown
	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	// Close database connection
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.Close()
	}

	// Close Redis connection
	redisClient.Close()

	logger.Info("Server stopped gracefully")
}

func initLogger(level string) *zap.Logger {
	// Parse log level
	var zapLevel zapcore.Level
	switch level {
	case "debug":
		zapLevel = zapcore.DebugLevel
	case "info":
		zapLevel = zapcore.InfoLevel
	case "warn":
		zapLevel = zapcore.WarnLevel
	case "error":
		zapLevel = zapcore.ErrorLevel
	default:
		zapLevel = zapcore.InfoLevel
	}

	// Create logger config
	config := zap.Config{
		Level:             zap.NewAtomicLevelAt(zapLevel),
		Development:       false,
		Encoding:          "json",
		EncoderConfig:     zap.NewProductionEncoderConfig(),
		OutputPaths:       []string{"stdout"},
		ErrorOutputPaths:  []string{"stderr"},
		DisableStacktrace: false,
	}

	// Customize time format
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, err := config.Build()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}

	return logger
}
