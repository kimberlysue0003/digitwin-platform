package database

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

// NewRedis creates a new Redis client connection
func NewRedis(url string) *redis.Client {
	opt, err := redis.ParseURL(url)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("✅ Redis connected successfully")

	return client
}
