// Timeout Middleware - Request timeout handler
package middleware

import (
	"context"
	"digitwin-backend/pkg/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// TimeoutMiddleware sets a timeout for each request
func TimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a context with timeout
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		// Replace request context
		c.Request = c.Request.WithContext(ctx)

		// Channel to signal completion
		finished := make(chan struct{})

		go func() {
			c.Next()
			finished <- struct{}{}
		}()

		select {
		case <-finished:
			// Request completed successfully
			return
		case <-ctx.Done():
			// Timeout occurred
			if ctx.Err() == context.DeadlineExceeded {
				response.Error(c, http.StatusGatewayTimeout, ctx.Err())
				c.Abort()
			}
		}
	}
}
