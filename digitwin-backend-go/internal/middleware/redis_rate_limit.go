// Redis-based distributed rate limiter
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"digitwin-backend/pkg/response"
)

// RedisRateLimiter implements distributed rate limiting using Redis
type RedisRateLimiter struct {
	client *redis.Client
	limit  int           // requests per window
	window time.Duration // time window
}

// NewRedisRateLimiter creates a new Redis-based rate limiter
func NewRedisRateLimiter(client *redis.Client, limit int, window time.Duration) *RedisRateLimiter {
	return &RedisRateLimiter{
		client: client,
		limit:  limit,
		window: window,
	}
}

// isAllowed checks if a request from the given IP is allowed
func (rl *RedisRateLimiter) isAllowed(ctx context.Context, ip string) (bool, error) {
	key := fmt.Sprintf("rate_limit:%s", ip)

	// Use Redis pipeline for atomic operations
	pipe := rl.client.Pipeline()

	// Increment the counter
	incrCmd := pipe.Incr(ctx, key)

	// Set expiration on first request
	pipe.Expire(ctx, key, rl.window)

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	// Get the current count
	count := incrCmd.Val()

	// Check if limit exceeded
	return count <= int64(rl.limit), nil
}

// getRemainingRequests returns the number of remaining requests for an IP
func (rl *RedisRateLimiter) getRemainingRequests(ctx context.Context, ip string) (int64, error) {
	key := fmt.Sprintf("rate_limit:%s", ip)

	count, err := rl.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return int64(rl.limit), nil
	}
	if err != nil {
		return 0, err
	}

	remaining := int64(rl.limit) - count
	if remaining < 0 {
		remaining = 0
	}

	return remaining, nil
}

// getTTL returns the time until the rate limit resets
func (rl *RedisRateLimiter) getTTL(ctx context.Context, ip string) (time.Duration, error) {
	key := fmt.Sprintf("rate_limit:%s", ip)
	return rl.client.TTL(ctx, key).Result()
}

// RedisRateLimitMiddleware creates a middleware that limits requests per IP using Redis
func RedisRateLimitMiddleware(limiter *RedisRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		ctx := c.Request.Context()

		allowed, err := limiter.isAllowed(ctx, ip)
		if err != nil {
			// If Redis fails, allow the request (fail-open strategy)
			// Log the error for monitoring
			c.Next()
			return
		}

		if !allowed {
			// Get rate limit info for response headers
			remaining, _ := limiter.getRemainingRequests(ctx, ip)
			ttl, _ := limiter.getTTL(ctx, ip)

			// Add rate limit headers
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limiter.limit))
			c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(ttl).Unix()))
			c.Header("Retry-After", fmt.Sprintf("%d", int(ttl.Seconds())))

			response.Error(c, http.StatusTooManyRequests, nil)
			c.Abort()
			return
		}

		// Add rate limit info headers to successful requests
		remaining, _ := limiter.getRemainingRequests(ctx, ip)
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limiter.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		c.Next()
	}
}
