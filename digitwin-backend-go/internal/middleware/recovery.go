// Recovery Middleware - Panic recovery
package middleware

import (
	"digitwin-backend/pkg/response"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RecoveryMiddleware recovers from panics and logs them
func RecoveryMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.String("ip", c.ClientIP()),
				)

				// Return error response
				response.Error(c, http.StatusInternalServerError, fmt.Errorf("internal server error: %v", err))
				c.Abort()
			}
		}()

		c.Next()
	}
}
