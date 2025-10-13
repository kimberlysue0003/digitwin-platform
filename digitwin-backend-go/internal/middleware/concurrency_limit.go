// Concurrency control middleware
package middleware

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// ConcurrencyLimiter limits concurrent requests per IP
type ConcurrencyLimiter struct {
	ipLimits map[string]*ipConcurrency
	mu       sync.RWMutex
	maxPerIP int // max concurrent requests per IP
}

type ipConcurrency struct {
	count int
	mu    sync.Mutex
}

// NewConcurrencyLimiter creates a new concurrency limiter
func NewConcurrencyLimiter(maxPerIP int) *ConcurrencyLimiter {
	return &ConcurrencyLimiter{
		ipLimits: make(map[string]*ipConcurrency),
		maxPerIP: maxPerIP,
	}
}

// acquire attempts to acquire a concurrency slot for the given IP
func (cl *ConcurrencyLimiter) acquire(ip string) bool {
	cl.mu.Lock()
	ipc, exists := cl.ipLimits[ip]
	if !exists {
		ipc = &ipConcurrency{count: 0}
		cl.ipLimits[ip] = ipc
	}
	cl.mu.Unlock()

	ipc.mu.Lock()
	defer ipc.mu.Unlock()

	if ipc.count >= cl.maxPerIP {
		return false
	}

	ipc.count++
	return true
}

// release releases a concurrency slot for the given IP
func (cl *ConcurrencyLimiter) release(ip string) {
	cl.mu.RLock()
	ipc, exists := cl.ipLimits[ip]
	cl.mu.RUnlock()

	if !exists {
		return
	}

	ipc.mu.Lock()
	defer ipc.mu.Unlock()

	if ipc.count > 0 {
		ipc.count--
	}

	// Cleanup if count reaches 0
	if ipc.count == 0 {
		cl.mu.Lock()
		// Double-check count after acquiring write lock
		ipc.mu.Lock()
		if ipc.count == 0 {
			delete(cl.ipLimits, ip)
		}
		ipc.mu.Unlock()
		cl.mu.Unlock()
	}
}

// ConcurrencyLimitMiddleware limits concurrent requests per IP
func ConcurrencyLimitMiddleware(limiter *ConcurrencyLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !limiter.acquire(ip) {
			c.Header("X-Concurrency-Limit", fmt.Sprintf("%d", limiter.maxPerIP))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   "Too many concurrent requests",
				"hint":    "Please wait for previous requests to complete",
			})
			c.Abort()
			return
		}

		// Ensure release is called even if panic occurs
		defer limiter.release(ip)

		c.Next()
	}
}
