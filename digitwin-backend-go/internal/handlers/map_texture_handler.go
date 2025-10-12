// MapTexture Handler - HTTP handlers for map texture endpoints
package handlers

import (
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/services"
	"digitwin-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

type MapTextureHandler struct {
	mapTextureService *services.MapTextureService
}

func NewMapTextureHandler(mapTextureService *services.MapTextureService) *MapTextureHandler {
	return &MapTextureHandler{
		mapTextureService: mapTextureService,
	}
}

// GetMapTextureByAreaID godoc
// @Summary Get map texture metadata for a planning area
// @Tags map-textures
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=models.MapTexture}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures/{areaId} [get]
func (h *MapTextureHandler) GetMapTextureByAreaID(c *gin.Context) {
	areaID := c.Param("areaId")

	mapTexture, err := h.mapTextureService.GetMapTextureByAreaID(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "map texture not found" || err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, mapTexture)
}

// GetMapTextureFile godoc
// @Summary Get the actual map texture PNG file
// @Tags map-textures
// @Produce image/png
// @Param areaId path string true "Area ID"
// @Success 200 {file} binary
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures/{areaId}/file [get]
func (h *MapTextureHandler) GetMapTextureFile(c *gin.Context) {
	areaID := c.Param("areaId")

	filePath, err := h.mapTextureService.GetMapTextureFilePath(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "map texture not found" || err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	// Serve the PNG file
	c.File(filePath)
}

// CreateMapTexture godoc
// @Summary Create a new map texture entry
// @Tags map-textures
// @Accept json
// @Produce json
// @Param mapTexture body models.MapTexture true "Map Texture"
// @Success 201 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures [post]
func (h *MapTextureHandler) CreateMapTexture(c *gin.Context) {
	var mapTexture models.MapTexture
	if err := c.ShouldBindJSON(&mapTexture); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	if err := h.mapTextureService.CreateMapTexture(c.Request.Context(), &mapTexture); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.SuccessWithStatus(c, http.StatusCreated, gin.H{"planningAreaId": mapTexture.PlanningAreaID})
}

// UpdateMapTexture godoc
// @Summary Update a map texture entry
// @Tags map-textures
// @Accept json
// @Produce json
// @Param areaId path string true "Area ID"
// @Param mapTexture body models.MapTexture true "Map Texture"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures/{areaId} [put]
func (h *MapTextureHandler) UpdateMapTexture(c *gin.Context) {
	areaID := c.Param("areaId")

	var mapTexture models.MapTexture
	if err := c.ShouldBindJSON(&mapTexture); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	mapTexture.PlanningAreaID = areaID

	if err := h.mapTextureService.UpdateMapTexture(c.Request.Context(), &mapTexture); err != nil {
		if err.Error() == "map texture not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Map texture updated successfully"})
}

// DeleteMapTexture godoc
// @Summary Delete a map texture entry
// @Tags map-textures
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures/{areaId} [delete]
func (h *MapTextureHandler) DeleteMapTexture(c *gin.Context) {
	areaID := c.Param("areaId")

	if err := h.mapTextureService.DeleteMapTexture(c.Request.Context(), areaID); err != nil {
		if err.Error() == "map texture not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Map texture deleted successfully"})
}

// ValidateMapTextureBounds godoc
// @Summary Validate that map texture bounds match the planning area
// @Tags map-textures
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/map-textures/{areaId}/validate [get]
func (h *MapTextureHandler) ValidateMapTextureBounds(c *gin.Context) {
	areaID := c.Param("areaId")

	if err := h.mapTextureService.ValidateMapTextureBounds(c.Request.Context(), areaID); err != nil {
		if err.Error() == "map texture not found" || err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	response.Success(c, gin.H{"message": "Map texture bounds are valid"})
}
