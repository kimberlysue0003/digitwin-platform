package models

import "time"

// MapTexture represents metadata for ground map texture images
type MapTexture struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	PlanningAreaID string    `gorm:"size:50;uniqueIndex;not null" json:"planning_area_id"`
	PNGFilePath    string    `gorm:"size:255" json:"png_file_path"`
	BoundsMinLat   float64   `json:"bounds_min_lat"`
	BoundsMinLng   float64   `json:"bounds_min_lng"`
	BoundsMaxLat   float64   `json:"bounds_max_lat"`
	BoundsMaxLng   float64   `json:"bounds_max_lng"`
	CenterLat      float64   `json:"center_lat"`
	CenterLng      float64   `json:"center_lng"`
	Zoom           int       `gorm:"default:14" json:"zoom"`
	Width          int       `gorm:"default:2048" json:"width"`
	Height         int       `gorm:"default:2048" json:"height"`
	CreatedAt      time.Time `json:"created_at"`
}

// TableName specifies the table name for MapTexture model
func (MapTexture) TableName() string {
	return "map_textures"
}
