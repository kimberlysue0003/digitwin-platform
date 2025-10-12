// WebSocket Handler - WebSocket connection handler
package handlers

import (
	"digitwin-backend/internal/services"
	"digitwin-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// In production, check origin properly
		return true
	},
}

type WebSocketHandler struct {
	wsService *services.WebSocketService
}

func NewWebSocketHandler(wsService *services.WebSocketService) *WebSocketHandler {
	return &WebSocketHandler{
		wsService: wsService,
	}
}

// HandleWebSocket godoc
// @Summary WebSocket endpoint for real-time data streaming
// @Tags websocket
// @Accept json
// @Produce json
// @Param areaId query string false "Subscribe to specific area (optional)"
// @Success 101 {string} string "Switching Protocols"
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /ws [get]
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get area ID from query parameter (optional)
	areaID := c.Query("areaId")

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	// Create client
	client := &services.Client{
		ID:         uuid.New().String(),
		Conn:       conn,
		Send:       make(chan []byte, 256),
		AreaID:     areaID,
		disconnect: make(chan struct{}),
	}

	// Register client
	h.wsService.RegisterClient(client)

	// Send welcome message
	h.wsService.SendToClient(client, "connected", map[string]interface{}{
		"clientId": client.ID,
		"message":  "Connected to DigitWin WebSocket",
	})

	// Start goroutines for reading and writing
	go h.wsService.WritePump(client)
	go h.wsService.HandleClientMessages(client)
}

// GetWebSocketStats godoc
// @Summary Get WebSocket statistics
// @Tags websocket
// @Produce json
// @Success 200 {object} response.Response{data=map[string]interface{}}
// @Router /api/ws/stats [get]
func (h *WebSocketHandler) GetWebSocketStats(c *gin.Context) {
	stats := map[string]interface{}{
		"connectedClients": h.wsService.GetConnectedClients(),
		"timestamp":        c.GetTime("timestamp"),
	}

	response.Success(c, stats)
}
