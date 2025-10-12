package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Point3D represents a 3D point in space
type Point3D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// StreamlinePoints is a slice of Point3D representing a wind streamline path
type StreamlinePoints []Point3D

// Scan implements sql.Scanner interface for JSONB deserialization
func (s *StreamlinePoints) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSONB value")
	}
	return json.Unmarshal(bytes, s)
}

// Value implements driver.Valuer interface for JSONB serialization
func (s StreamlinePoints) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// WindStreamline represents a wind flow path in the digital twin
type WindStreamline struct {
	ID             uint             `gorm:"primaryKey;autoIncrement" json:"id"`
	PlanningAreaID string           `gorm:"size:50;index;not null" json:"planning_area_id"`
	Direction      string           `gorm:"size:5;index" json:"direction"` // N, NE, E, SE, S, SW, W, NW
	Points         StreamlinePoints `gorm:"type:jsonb" json:"points"`
	CreatedAt      time.Time        `json:"created_at"`
}

// TableName specifies the table name for WindStreamline model
func (WindStreamline) TableName() string {
	return "wind_streamlines"
}
