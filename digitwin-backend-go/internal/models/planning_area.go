package models

import "time"

// PlanningArea represents a planning area in Singapore
type PlanningArea struct {
	ID           string    `gorm:"primaryKey;size:50" json:"id"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	Region       string    `gorm:"size:20;index" json:"region"`
	CenterLat    float64   `json:"center_lat"`
	CenterLng    float64   `json:"center_lng"`
	BoundsMinLat float64   `json:"bounds_min_lat"`
	BoundsMinLng float64   `json:"bounds_min_lng"`
	BoundsMaxLat float64   `json:"bounds_max_lat"`
	BoundsMaxLng float64   `json:"bounds_max_lng"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// Relations (will not be loaded by default)
	Buildings       []Building       `gorm:"foreignKey:PlanningAreaID" json:"buildings,omitempty"`
	WindStreamlines []WindStreamline `gorm:"foreignKey:PlanningAreaID" json:"streamlines,omitempty"`
	MapTexture      *MapTexture      `gorm:"foreignKey:PlanningAreaID" json:"map_texture,omitempty"`
}

// TableName specifies the table name for PlanningArea model
func (PlanningArea) TableName() string {
	return "planning_areas"
}
