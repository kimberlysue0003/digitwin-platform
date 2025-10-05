// 2D Map View with real Singapore map and accurate polygon boundaries
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, GeoJSON } from 'react-leaflet';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { MAIN_REGIONS } from '../../data/planningAreas';
import { fetchPlanningAreasGeoJSON } from '../../services/geoDataService';
import { DataOverlays } from './DataOverlays';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Component to fit map bounds on mount (only once)
function FitBounds() {
  const map = useMap();

  useEffect(() => {
    // Fit to Singapore bounds only on initial mount
    map.fitBounds([[1.15, 103.6], [1.48, 104.05]]);
  }, []); // Empty dependency array ensures this runs only once

  return null;
}

export function MapView() {
  const { setViewMode, setSelectedRegion, activeLayer } = useEnvironmentStore();
  const [selectedPlanningArea, setSelectedPlanningArea] = useState<string | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Load GeoJSON (will try from file first, fallback to embedded data)
    fetchPlanningAreasGeoJSON().then(data => {
      setGeoData(data);
    });
  }, []);

  const handleAreaClick = (areaName: string, region: string) => {
    setSelectedPlanningArea(areaName);
    setSelectedRegion(region as any);
    // Wait a moment before switching to 3D view
    setTimeout(() => {
      setViewMode('3d');
    }, 200);
  };

  if (!geoData) return <div>Loading map...</div>;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
    }}>
      <MapContainer
        center={[1.3521, 103.8198]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <FitBounds />

        {/* Base map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Planning areas as polygons */}
        <GeoJSON
          data={geoData}
          style={(feature) => {
            const region = feature?.properties?.region;
            const mainRegion = MAIN_REGIONS.find(r => r.id === region);
            const isHovered = hoveredArea === feature?.properties?.name;
            const isSelected = selectedPlanningArea === feature?.properties?.name;

            return {
              color: mainRegion?.color || '#666',
              weight: isHovered || isSelected ? 3 : 1,
              fillColor: mainRegion?.color || '#666',
              fillOpacity: isHovered ? 0.3 : isSelected ? 0.25 : 0.1,
            };
          }}
          onEachFeature={(feature, layer) => {
            const areaName = feature.properties?.name;
            const region = feature.properties?.region;

            layer.on({
              click: () => handleAreaClick(areaName, region),
              mouseover: () => setHoveredArea(areaName),
              mouseout: () => setHoveredArea(null),
            });

            // Add tooltip
            if (hoveredArea === areaName) {
              layer.bindTooltip(
                `<div style="text-align: center;">
                  <div style="font-weight: 600; font-size: 12px;">${areaName}</div>
                  <div style="font-size: 10px; color: #666;">Click to view 3D</div>
                </div>`,
                { direction: 'center', opacity: 0.9, permanent: true }
              ).openTooltip();
            }
          }}
        />

        {/* Environmental data overlays */}
        <DataOverlays layer={activeLayer} geoData={geoData} onAreaClick={handleAreaClick} />
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxWidth: '200px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
          Regions
        </div>
        {MAIN_REGIONS.map((region) => (
          <div key={region.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: region.color,
              opacity: 0.6,
              borderRadius: '3px',
            }} />
            <span style={{ fontSize: '12px', color: '#4b5563', textTransform: 'capitalize' }}>
              {region.name}
            </span>
          </div>
        ))}
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#9ca3af' }}>
          {geoData.features.length} Planning Areas
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '14px',
        color: '#1f2937',
        fontWeight: '500',
      }}>
        Click on any planning area to view detailed 3D buildings
      </div>
    </div>
  );
}
