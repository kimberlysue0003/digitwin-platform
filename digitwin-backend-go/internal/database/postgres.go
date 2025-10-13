package database

import (
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewPostgres creates a new PostgreSQL database connection
func NewPostgres(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		DisableForeignKeyConstraintWhenMigrating: true,
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	// Connection pool settings for high concurrency
	// MaxIdleConns: Keep 50 idle connections ready for burst traffic
	sqlDB.SetMaxIdleConns(50)
	// MaxOpenConns: Support up to 500 concurrent database connections
	// This allows 100+ concurrent users (each loading ~5 chunks simultaneously)
	sqlDB.SetMaxOpenConns(500)
	// ConnMaxLifetime: Recycle connections every hour to prevent stale connections
	sqlDB.SetConnMaxLifetime(time.Hour)
	// ConnMaxIdleTime: Close idle connections after 10 minutes
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	log.Println("✅ Database connected successfully")

	return db
}

// AutoMigrate runs database migrations for all models
func AutoMigrate(db *gorm.DB, models ...interface{}) error {
	if err := db.AutoMigrate(models...); err != nil {
		log.Printf("Failed to migrate database: %v", err)
		return err
	}
	log.Println("✅ Database migrated successfully")
	return nil
}
