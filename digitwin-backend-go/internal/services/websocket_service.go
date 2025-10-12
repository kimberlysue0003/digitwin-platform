// WebSocket Service - Real-time data streaming
package services

import (
	"context"
	"digitwin-backend/internal/repositories"
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketMessage represents a message sent to clients
type WebSocketMessage struct {
	Type      string      `json:"type"`      // "environment_update", "building_update", "error"
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// EnvironmentData represents real-time environment data
type EnvironmentData struct {
	AreaID      string  `json:"areaId"`
	Temperature float64 `json:"temperature"` // Celsius
	Humidity    float64 `json:"humidity"`    // Percentage
	WindSpeed   float64 `json:"windSpeed"`   // m/s
	WindDir     string  `json:"windDir"`     // N, NE, E, SE, S, SW, W, NW
	AQI         int     `json:"aqi"`         // Air Quality Index
}

// Client represents a connected WebSocket client
type Client struct {
	ID         string
	Conn       *websocket.Conn
	Send       chan []byte
	AreaID     string // Subscribed area ID
	Disconnect chan struct{}
}

// WebSocketService manages WebSocket connections and broadcasts
type WebSocketService struct {
	clients        map[*Client]bool
	broadcast      chan []byte
	register       chan *Client
	unregister     chan *Client
	mu             sync.RWMutex
	areaRepo       *repositories.AreaRepository
	buildingRepo   *repositories.BuildingRepository
	streamlineRepo *repositories.StreamlineRepository
}

func NewWebSocketService(
	areaRepo *repositories.AreaRepository,
	buildingRepo *repositories.BuildingRepository,
	streamlineRepo *repositories.StreamlineRepository,
) *WebSocketService {
	service := &WebSocketService{
		clients:        make(map[*Client]bool),
		broadcast:      make(chan []byte, 256),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		areaRepo:       areaRepo,
		buildingRepo:   buildingRepo,
		streamlineRepo: streamlineRepo,
	}

	// Start the hub
	go service.run()

	// Start environment data broadcaster
	go service.broadcastEnvironmentData()

	return service
}

// run handles client registration/unregistration and broadcasting
func (s *WebSocketService) run() {
	for {
		select {
		case client := <-s.register:
			s.mu.Lock()
			s.clients[client] = true
			s.mu.Unlock()
			log.Printf("WebSocket client connected: %s (area: %s), total: %d", client.ID, client.AreaID, len(s.clients))

		case client := <-s.unregister:
			s.mu.Lock()
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				close(client.Send)
				log.Printf("WebSocket client disconnected: %s, remaining: %d", client.ID, len(s.clients))
			}
			s.mu.Unlock()

		case message := <-s.broadcast:
			s.mu.RLock()
			for client := range s.clients {
				select {
				case client.Send <- message:
				default:
					// Client is slow, disconnect
					close(client.Send)
					delete(s.clients, client)
				}
			}
			s.mu.RUnlock()
		}
	}
}

// RegisterClient adds a new WebSocket client
func (s *WebSocketService) RegisterClient(client *Client) {
	s.register <- client
}

// UnregisterClient removes a WebSocket client
func (s *WebSocketService) UnregisterClient(client *Client) {
	s.unregister <- client
}

// BroadcastMessage sends a message to all connected clients
func (s *WebSocketService) BroadcastMessage(msgType string, data interface{}) error {
	message := WebSocketMessage{
		Type:      msgType,
		Timestamp: time.Now(),
		Data:      data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	s.broadcast <- jsonData
	return nil
}

// SendToClient sends a message to a specific client
func (s *WebSocketService) SendToClient(client *Client, msgType string, data interface{}) error {
	message := WebSocketMessage{
		Type:      msgType,
		Timestamp: time.Now(),
		Data:      data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	select {
	case client.Send <- jsonData:
		return nil
	default:
		return nil // Client buffer full, skip
	}
}

// broadcastEnvironmentData simulates real-time environment data updates
func (s *WebSocketService) broadcastEnvironmentData() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	ctx := context.Background()

	for range ticker.C {
		// Get all areas
		areas, err := s.areaRepo.GetAll(ctx)
		if err != nil {
			continue
		}

		// Send environment data for each area
		for _, area := range areas {
			envData := s.generateEnvironmentData(area.ID)

			// Only send to clients subscribed to this area
			s.mu.RLock()
			for client := range s.clients {
				if client.AreaID == "" || client.AreaID == area.ID {
					s.SendToClient(client, "environment_update", envData)
				}
			}
			s.mu.RUnlock()
		}
	}
}

// generateEnvironmentData creates simulated environment data
func (s *WebSocketService) generateEnvironmentData(areaID string) EnvironmentData {
	directions := []string{"N", "NE", "E", "SE", "S", "SW", "W", "NW"}

	return EnvironmentData{
		AreaID:      areaID,
		Temperature: 25 + rand.Float64()*10,      // 25-35°C
		Humidity:    60 + rand.Float64()*30,      // 60-90%
		WindSpeed:   2 + rand.Float64()*8,        // 2-10 m/s
		WindDir:     directions[rand.Intn(8)],    // Random direction
		AQI:         50 + rand.Intn(100),         // 50-150 AQI
	}
}

// GetConnectedClients returns the number of connected clients
func (s *WebSocketService) GetConnectedClients() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.clients)
}

// HandleClientMessages processes incoming messages from a client
func (s *WebSocketService) HandleClientMessages(client *Client) {
	defer func() {
		s.UnregisterClient(client)
		client.Conn.Close()
	}()

	client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse incoming message
		var msg struct {
			Type   string `json:"type"`
			AreaID string `json:"areaId"`
		}

		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle different message types
		switch msg.Type {
		case "subscribe":
			client.AreaID = msg.AreaID
			s.SendToClient(client, "subscribed", map[string]string{"areaId": msg.AreaID})
		case "unsubscribe":
			client.AreaID = ""
			s.SendToClient(client, "unsubscribed", nil)
		case "ping":
			s.SendToClient(client, "pong", nil)
		}
	}
}

// WritePump sends messages from the hub to the client
func (s *WebSocketService) WritePump(client *Client) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			// Send ping
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-client.Disconnect:
			return
		}
	}
}
