// Streamline Handler - HTTP handlers for wind streamline endpoints
package handlers

import (
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/services"
	"digitwin-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

type StreamlineHandler struct {
	streamlineService *services.StreamlineService
}

func NewStreamlineHandler(streamlineService *services.StreamlineService) *StreamlineHandler {
	return &StreamlineHandler{
		streamlineService: streamlineService,
	}
}

// GetStreamlinesByAreaAndDirection godoc
// @Summary Get wind streamlines for a planning area and direction
// @Tags streamlines
// @Produce json
// @Param areaId path string true "Area ID"
// @Param direction query string false "Wind direction (N/NE/E/SE/S/SW/W/NW)"
// @Success 200 {object} response.Response{data=[]models.WindStreamline}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/streamlines/{areaId} [get]
func (h *StreamlineHandler) GetStreamlinesByAreaAndDirection(c *gin.Context) {
	areaID := c.Param("areaId")
	direction := c.Query("direction")

	streamlines, err := h.streamlineService.GetStreamlinesByAreaAndDirection(c.Request.Context(), areaID, direction)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	response.Success(c, streamlines)
}

// GetAllStreamlinesByArea godoc
// @Summary Get all wind streamlines for a planning area
// @Tags streamlines
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=[]models.WindStreamline}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/streamlines/{areaId}/all [get]
func (h *StreamlineHandler) GetAllStreamlinesByArea(c *gin.Context) {
	areaID := c.Param("areaId")

	streamlines, err := h.streamlineService.GetAllStreamlinesByArea(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, streamlines)
}

// CreateStreamlines godoc
// @Summary Create multiple wind streamlines in batch
// @Tags streamlines
// @Accept json
// @Produce json
// @Param streamlines body []models.WindStreamline true "Wind Streamlines"
// @Success 201 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/streamlines [post]
func (h *StreamlineHandler) CreateStreamlines(c *gin.Context) {
	var streamlines []models.WindStreamline
	if err := c.ShouldBindJSON(&streamlines); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	if err := h.streamlineService.CreateStreamlines(c.Request.Context(), streamlines); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.SuccessWithStatus(c, http.StatusCreated, gin.H{"count": len(streamlines)})
}

// DeleteStreamlinesByAreaID godoc
// @Summary Delete all wind streamlines for a planning area
// @Tags streamlines
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/streamlines/{areaId} [delete]
func (h *StreamlineHandler) DeleteStreamlinesByAreaID(c *gin.Context) {
	areaID := c.Param("areaId")

	if err := h.streamlineService.DeleteStreamlinesByAreaID(c.Request.Context(), areaID); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Streamlines deleted successfully"})
}

// GetStreamlineStats godoc
// @Summary Get statistics about wind streamlines in a planning area
// @Tags streamlines
// @Produce json
// @Param areaId path string true "Area ID"
// @Success 200 {object} response.Response{data=map[string]interface{}}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/streamlines/{areaId}/stats [get]
func (h *StreamlineHandler) GetStreamlineStats(c *gin.Context) {
	areaID := c.Param("areaId")

	stats, err := h.streamlineService.GetStreamlineStats(c.Request.Context(), areaID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, stats)
}
