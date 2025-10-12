// Building Handler - HTTP handlers for building endpoints
package handlers

import (
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/services"
	"digitwin-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type BuildingHandler struct {
	buildingService *services.BuildingService
}

func NewBuildingHandler(buildingService *services.BuildingService) *BuildingHandler {
	return &BuildingHandler{
		buildingService: buildingService,
	}
}

// GetBuildingsByAreaID godoc
// @Summary Get all buildings for a planning area
// @Tags buildings
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=[]models.Building}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings/{areaId} [get]
func (h *BuildingHandler) GetBuildingsByAreaID(c *gin.Context) {
	areaID := c.Param("areaId")

	buildings, err := h.buildingService.GetBuildingsByAreaID(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, buildings)
}

// GetBuildingChunkInfo godoc
// @Summary Get chunk information for buildings in a planning area
// @Tags buildings
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=repositories.ChunkInfo}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings/{areaId}/chunks/info [get]
func (h *BuildingHandler) GetBuildingChunkInfo(c *gin.Context) {
	areaID := c.Param("areaId")

	chunkInfo, err := h.buildingService.GetBuildingChunkInfo(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, chunkInfo)
}

// GetBuildingChunk godoc
// @Summary Get a specific chunk of buildings
// @Tags buildings
// @Produce json
// @Param areaId path string true "Area ID"
// @Param chunkIndex path int true "Chunk Index (0-based)"
// @Success 200 {object} response.Response{data=[]models.Building}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings/{areaId}/chunks/{chunkIndex} [get]
func (h *BuildingHandler) GetBuildingChunk(c *gin.Context) {
	areaID := c.Param("areaId")
	chunkIndexStr := c.Param("chunkIndex")

	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	buildings, err := h.buildingService.GetBuildingChunk(c.Request.Context(), areaID, chunkIndex)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	response.Success(c, buildings)
}

// CreateBuildings godoc
// @Summary Create multiple buildings in batch
// @Tags buildings
// @Accept json
// @Produce json
// @Param buildings body []models.Building true "Buildings"
// @Success 201 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings [post]
func (h *BuildingHandler) CreateBuildings(c *gin.Context) {
	var buildings []models.Building
	if err := c.ShouldBindJSON(&buildings); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	if err := h.buildingService.CreateBuildings(c.Request.Context(), buildings); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.SuccessWithStatus(c, http.StatusCreated, gin.H{"count": len(buildings)})
}

// DeleteBuildingsByAreaID godoc
// @Summary Delete all buildings for a planning area
// @Tags buildings
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings/{areaId} [delete]
func (h *BuildingHandler) DeleteBuildingsByAreaID(c *gin.Context) {
	areaID := c.Param("areaId")

	if err := h.buildingService.DeleteBuildingsByAreaID(c.Request.Context(), areaID); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Buildings deleted successfully"})
}

// GetBuildingStats godoc
// @Summary Get statistics about buildings in a planning area
// @Tags buildings
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=map[string]interface{}}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/buildings/{areaId}/stats [get]
func (h *BuildingHandler) GetBuildingStats(c *gin.Context) {
	areaID := c.Param("areaId")

	stats, err := h.buildingService.GetBuildingStats(c.Request.Context(), areaID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, stats)
}
