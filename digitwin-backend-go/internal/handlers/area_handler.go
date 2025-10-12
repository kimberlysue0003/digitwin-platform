// Area Handler - HTTP handlers for planning area endpoints
package handlers

import (
	"digitwin-backend/internal/models"
	"digitwin-backend/internal/services"
	"digitwin-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AreaHandler struct {
	areaService *services.AreaService
}

func NewAreaHandler(areaService *services.AreaService) *AreaHandler {
	return &AreaHandler{
		areaService: areaService,
	}
}

// GetAllAreas godoc
// @Summary Get all planning areas
// @Tags areas
// @Produce json
// @Success 200 {object} response.Response{data=[]models.PlanningArea}
// @Failure 500 {object} response.Response
// @Router /api/areas [get]
func (h *AreaHandler) GetAllAreas(c *gin.Context) {
	areas, err := h.areaService.GetAllAreas(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, areas)
}

// GetAreaByID godoc
// @Summary Get a planning area by ID
// @Tags areas
// @Produce json
// @Param id path string true "Area ID"
// @Success 200 {object} response.Response{data=models.PlanningArea}
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/areas/{id} [get]
func (h *AreaHandler) GetAreaByID(c *gin.Context) {
	areaID := c.Param("id")

	area, err := h.areaService.GetAreaByID(c.Request.Context(), areaID)
	if err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, area)
}

// GetAreasByRegion godoc
// @Summary Get planning areas by region
// @Tags areas
// @Produce json
// @Param region path string true "Region name (central/north/south/east/west)"
// @Success 200 {object} response.Response{data=[]models.PlanningArea}
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/areas/region/{region} [get]
func (h *AreaHandler) GetAreasByRegion(c *gin.Context) {
	region := c.Param("region")

	areas, err := h.areaService.GetAreasByRegion(c.Request.Context(), region)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	response.Success(c, areas)
}

// CreateArea godoc
// @Summary Create a new planning area
// @Tags areas
// @Accept json
// @Produce json
// @Param area body models.PlanningArea true "Planning Area"
// @Success 201 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/areas [post]
func (h *AreaHandler) CreateArea(c *gin.Context) {
	var area models.PlanningArea
	if err := c.ShouldBindJSON(&area); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	if err := h.areaService.CreateArea(c.Request.Context(), &area); err != nil {
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.SuccessWithStatus(c, http.StatusCreated, gin.H{"id": area.ID})
}

// UpdateArea godoc
// @Summary Update a planning area
// @Tags areas
// @Accept json
// @Produce json
// @Param id path string true "Area ID"
// @Param area body models.PlanningArea true "Planning Area"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/areas/{id} [put]
func (h *AreaHandler) UpdateArea(c *gin.Context) {
	areaID := c.Param("id")

	var area models.PlanningArea
	if err := c.ShouldBindJSON(&area); err != nil {
		response.Error(c, http.StatusBadRequest, err)
		return
	}

	area.ID = areaID

	if err := h.areaService.UpdateArea(c.Request.Context(), &area); err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Area updated successfully"})
}

// DeleteArea godoc
// @Summary Delete a planning area
// @Tags areas
// @Produce json
// @Param id path string true "Area ID"
// @Success 200 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/areas/{id} [delete]
func (h *AreaHandler) DeleteArea(c *gin.Context) {
	areaID := c.Param("id")

	if err := h.areaService.DeleteArea(c.Request.Context(), areaID); err != nil {
		if err.Error() == "planning area not found" {
			response.Error(c, http.StatusNotFound, err)
			return
		}
		response.Error(c, http.StatusInternalServerError, err)
		return
	}

	response.Success(c, gin.H{"message": "Area deleted successfully"})
}
