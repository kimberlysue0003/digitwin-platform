package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response represents a standard API response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Success sends a successful JSON response
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    data,
	})
}

// SuccessWithMessage sends a successful JSON response with a message
func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SuccessWithStatus sends a successful JSON response with custom status code
func SuccessWithStatus(c *gin.Context, status int, data interface{}) {
	c.JSON(status, Response{
		Success: true,
		Data:    data,
	})
}

// Error sends an error JSON response
func Error(c *gin.Context, status int, err error) {
	errorMsg := ""
	if err != nil {
		errorMsg = err.Error()
	}
	c.JSON(status, Response{
		Success: false,
		Error:   errorMsg,
	})
}

// ErrorWithMessage sends an error JSON response with both message and error
func ErrorWithMessage(c *gin.Context, status int, message string, err error) {
	c.JSON(status, Response{
		Success: false,
		Message: message,
		Error:   err.Error(),
	})
}
