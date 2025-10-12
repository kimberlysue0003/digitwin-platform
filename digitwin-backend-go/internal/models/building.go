package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Point2D represents a 2D point in space
type Point2D struct {
	X float64 `json:"x"`
	Z float64 `json:"z"`
}

// Footprint is a slice of Point2D representing a building footprint
type Footprint []Point2D

// Scan implements sql.Scanner interface for JSONB deserialization
func (f *Footprint) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSONB value")
	}
	return json.Unmarshal(bytes, f)
}

// Value implements driver.Valuer interface for JSONB serialization
func (f Footprint) Value() (driver.Value, error) {
	return json.Marshal(f)
}

// Building represents a building in the digital twin
type Building struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	PlanningAreaID string    `gorm:"size:50;index;not null" json:"planning_area_id"`
	Footprint      Footprint `gorm:"type:jsonb" json:"footprint"`
	Height         float64   `json:"height"`
	BuildingType   *string   `gorm:"size:50" json:"building_type,omitempty"`
	Levels         *int      `json:"levels,omitempty"`
	Source         string    `gorm:"default:'OpenStreetMap'" json:"source"`
	FetchedAt      time.Time `json:"fetched_at"`
	CreatedAt      time.Time `json:"created_at"`
}

// TableName specifies the table name for Building model
func (Building) TableName() string {
	return "buildings"
}
