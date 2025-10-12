// Rate Limit Middleware - Simple rate limiting
package middleware

import (
	"digitwin-backend/pkg/response"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	lastSeen time.Time
	count    int
}

type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	limit    int           // requests per window
	window   time.Duration // time window
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   window,
	}

	// Clean up old visitors every minute
	go rl.cleanupVisitors()

	return rl
}

func (rl *RateLimiter) cleanupVisitors() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.window {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) isAllowed(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	now := time.Now()

	if !exists {
		rl.visitors[ip] = &visitor{
			lastSeen: now,
			count:    1,
		}
		return true
	}

	// Reset counter if window has passed
	if now.Sub(v.lastSeen) > rl.window {
		v.count = 1
		v.lastSeen = now
		return true
	}

	// Check if limit exceeded
	if v.count >= rl.limit {
		return false
	}

	v.count++
	v.lastSeen = now
	return true
}

// RateLimitMiddleware limits requests per IP
func RateLimitMiddleware(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !limiter.isAllowed(ip) {
			response.Error(c, http.StatusTooManyRequests, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}
