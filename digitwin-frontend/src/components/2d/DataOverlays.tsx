// Environmental data overlays for 2D map
import React, { useEffect, useMemo } from 'react';
import { CircleMarker, Popup, Marker, useMap, Circle, Polygon } from 'react-leaflet';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { VisualizationLayer } from '../../stores/environmentStore';
import L from 'leaflet';

interface DataOverlaysProps {
  layer: VisualizationLayer;
  geoData?: any;
  onAreaClick?: (areaName: string, region: string) => void;
}

export function DataOverlays({ layer, geoData, onAreaClick }: DataOverlaysProps) {
  const { data } = useEnvironmentStore();
  const map = useMap();

  if (!data || !layer) return null;

  // Temperature overlay with animated markers and gradient transitions
  if (layer === 'temperature' && data.temperature?.readings && data.temperature?.stations) {
    // Get temperature color
    const getTempColor = (temp: number) => {
      if (temp < 26) return '#3b82f6'; // Blue
      if (temp < 28) return '#10b981'; // Green
      if (temp < 30) return '#fbbf24'; // Yellow
      return '#ef4444'; // Red
    };

    return (
      <>
        {/* Gradient overlays between stations */}
        {data.temperature.readings.map((reading, index) => {
          const station = data.temperature.stations.find((s: any) => s.id === reading.station_id);
          if (!station) return null;

          const temp = reading.value;
          const color = getTempColor(temp);

          return (
            <Circle
              key={`temp-gradient-${index}`}
              center={[station.location.latitude, station.location.longitude]}
              radius={3000} // 3km radius for gradient effect
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.15,
                color: color,
                weight: 0,
              }}
            />
          );
        })}

        {/* Animated temperature markers */}
        {data.temperature.readings.map((reading, index) => {
          const station = data.temperature.stations.find((s: any) => s.id === reading.station_id);
          if (!station) return null;

          const temp = reading.value;
          const color = getTempColor(temp);

          // Create animated temperature marker with pulsing effect
          const tempIcon = L.divIcon({
            html: `
              <div style="position: relative; width: 60px; height: 60px;">
                <!-- Pulsing outer ring -->
                <svg width="60" height="60" style="position: absolute; top: 0; left: 0;">
                  <circle cx="30" cy="30" r="20" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
                    <animate attributeName="r" from="15" to="25" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="30" cy="30" r="20" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
                    <animate attributeName="r" from="15" to="25" dur="2s" begin="1s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="2s" begin="1s" repeatCount="indefinite"/>
                  </circle>

                  <!-- Glow effect -->
                  <circle cx="30" cy="30" r="14" fill="${color}" opacity="0.3" filter="blur(4px)"/>

                  <!-- Main circle with white border -->
                  <circle cx="30" cy="30" r="12" fill="white" stroke="${color}" stroke-width="2.5"/>

                  <!-- Temperature value -->
                  <text x="30" y="34" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">
                    ${temp.toFixed(1)}
                  </text>
                </svg>
              </div>
            `,
            className: 'temp-marker-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 30],
          });

          return (
            <Marker
              key={`temp-${index}`}
              position={[station.location.latitude, station.location.longitude]}
              icon={tempIcon}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {station.name || station.id}
                  </div>
                  <div style={{ color: color, fontWeight: '700', fontSize: '16px' }}>
                    {temp}°C
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }

  // Wind overlay with animated flow
  if (layer === 'wind' && data.wind?.speed && data.wind?.direction && data.wind?.stations) {
    return (
      <>
        {data.wind.speed.map((reading, index) => {
          const station = data.wind.stations.find((s: any) => s.id === reading.station_id);
          const direction = data.wind.direction.find((d) => d.station_id === reading.station_id);
          if (!station || !direction) return null;

          const speed = reading.speed;
          const angle = direction.direction;

          // Color based on wind speed - bright colors
          const getColor = () => {
            if (speed < 5) return '#22d3ee'; // Cyan-400 (bright)
            if (speed < 10) return '#06b6d4'; // Cyan-500
            if (speed < 15) return '#0891b2'; // Cyan-600
            return '#0e7490'; // Cyan-700
          };

          // Get lighter color for glow effect
          const getGlowColor = () => {
            if (speed < 5) return '#a5f3fc'; // Cyan-200 (very light)
            if (speed < 10) return '#67e8f9'; // Cyan-300
            if (speed < 15) return '#22d3ee'; // Cyan-400
            return '#06b6d4'; // Cyan-500
          };

          // Create animated wind flow with curved streamlines
          const createWindStreamlines = () => {
            const streamlines = [];
            const streamCount = 5; // 5 parallel curved lines
            const duration = Math.max(1, 2 - speed / 15); // Faster for stronger wind

            for (let i = 0; i < streamCount; i++) {
              const yPos = 30 + i * 15; // Vertical spacing
              const curveHeight = 8; // Arc curvature
              const delay = i * 0.15;

              // Create flowing dashed line with curve, white border and glow
              streamlines.push(`
                <!-- Glow effect layer -->
                <path
                  d="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                  stroke="${getGlowColor()}"
                  stroke-width="7"
                  fill="none"
                  opacity="0.3"
                  stroke-dasharray="8 12"
                  stroke-linecap="round"
                  filter="blur(3px)">
                  <animate attributeName="stroke-dashoffset"
                    from="0" to="-20"
                    dur="${duration}s"
                    begin="${delay}s"
                    repeatCount="indefinite"/>
                </path>

                <!-- White border for contrast -->
                <path
                  d="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                  stroke="rgba(255, 255, 255, 0.6)"
                  stroke-width="5"
                  fill="none"
                  stroke-dasharray="8 12"
                  stroke-linecap="round">
                  <animate attributeName="stroke-dashoffset"
                    from="0" to="-20"
                    dur="${duration}s"
                    begin="${delay}s"
                    repeatCount="indefinite"/>
                </path>

                <!-- Main flow line -->
                <path
                  d="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                  stroke="${getColor()}"
                  stroke-width="3.5"
                  fill="none"
                  opacity="1"
                  stroke-dasharray="8 12"
                  stroke-linecap="round">
                  <animate attributeName="stroke-dashoffset"
                    from="0" to="-20"
                    dur="${duration}s"
                    begin="${delay}s"
                    repeatCount="indefinite"/>
                  <animate attributeName="opacity"
                    values="0.7;1;1;0.7"
                    dur="${duration * 2}s"
                    begin="${delay}s"
                    repeatCount="indefinite"/>
                </path>
              `);

              // Add flowing particles along the streamlines with white border
              for (let j = 0; j < 3; j++) {
                const particleDelay = delay + j * 0.4;
                streamlines.push(`
                  <!-- Particle glow -->
                  <circle r="5" fill="${getGlowColor()}" opacity="0" filter="blur(3px)">
                    <animate attributeName="opacity"
                      values="0;0.5;0.5;0"
                      keyTimes="0;0.2;0.8;1"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                    <animateMotion
                      path="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                  </circle>

                  <!-- Particle white border -->
                  <circle r="4" fill="rgba(255, 255, 255, 0.8)" opacity="0">
                    <animate attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.2;0.8;1"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                    <animateMotion
                      path="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                  </circle>

                  <!-- Particle core -->
                  <circle r="3" fill="${getColor()}" opacity="0">
                    <animate attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.2;0.8;1"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                    <animateMotion
                      path="M 0 ${yPos} Q 40 ${yPos - curveHeight}, 80 ${yPos} T 160 ${yPos}"
                      dur="${duration}s"
                      begin="${particleDelay}s"
                      repeatCount="indefinite"/>
                  </circle>
                `);
              }
            }
            return streamlines.join('');
          };

          const flowIcon = L.divIcon({
            html: `
              <div style="
                width: 160px;
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: rotate(${angle}deg);
                pointer-events: auto;
              ">
                <svg width="160" height="100" viewBox="0 0 160 100" style="overflow: visible;">
                  <!-- Animated streamlines -->
                  ${createWindStreamlines()}

                  <!-- Speed indicator with background - centered and counter-rotated -->
                  <g transform="rotate(${-angle} 80 50)">
                    <rect x="60" y="42" width="40" height="16" fill="#fff" opacity="0.85" rx="8"/>
                    <text x="80" y="53" text-anchor="middle" font-size="11" font-weight="700" fill="${getColor()}">
                      ${speed.toFixed(1)} kts
                    </text>
                  </g>
                </svg>
              </div>
            `,
            className: 'wind-flow-icon',
            iconSize: [160, 100],
            iconAnchor: [80, 50],
          });

          return (
            <React.Fragment key={`wind-${index}`}>
              <Marker
                position={[station.location.latitude, station.location.longitude]}
                icon={flowIcon}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {station.name || station.id}
                    </div>
                    <div style={{ color: getColor(), fontWeight: '700', fontSize: '14px' }}>
                      {speed} kts
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Direction: {angle}°
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </>
    );
  }

  // Air Quality overlay with particle effects - using planning area polygons
  if (layer === 'airQuality' && data.pollution?.pm25 && geoData) {
    // Color based on PM2.5 level
    const getAQColor = (pm25: number) => {
      if (pm25 < 12) return '#10b981'; // Good - Green
      if (pm25 < 35) return '#fbbf24'; // Moderate - Yellow
      if (pm25 < 55) return '#f97316'; // Unhealthy for sensitive - Orange
      return '#ef4444'; // Unhealthy - Red
    };

    const getAQLabel = (pm25: number) => {
      if (pm25 < 12) return 'Good';
      if (pm25 < 35) return 'Moderate';
      if (pm25 < 55) return 'Unhealthy';
      return 'Very Unhealthy';
    };

    // Calculate center of a polygon or multipolygon
    const getPolygonCenter = (geometry: any): [number, number] | null => {
      if (!geometry || !geometry.coordinates) {
        console.warn('Invalid geometry structure:', geometry);
        return null;
      }

      let latSum = 0;
      let lngSum = 0;
      let count = 0;

      // Handle both Polygon and MultiPolygon
      const coords = geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]  // First polygon of MultiPolygon
        : geometry.coordinates[0];     // Polygon

      if (!Array.isArray(coords)) {
        console.warn('No valid coordinates array found');
        return null;
      }

      coords.forEach((point: any) => {
        if (Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number') {
          lngSum += point[0];
          latSum += point[1];
          count++;
        }
      });

      if (count === 0) {
        console.warn('No valid points found in coordinates');
        return null;
      }

      return [latSum / count, lngSum / count];
    };

    return (
      <>
        {/* Polygon overlays for each planning area */}
        {geoData.features.map((feature: any, index: number) => {
          const region = feature.properties?.region || 'central';
          const pm25Reading = data.pollution.pm25.find((r) => r.region === region);
          if (!pm25Reading) return null;

          const pm25 = pm25Reading.pm25;
          const color = getAQColor(pm25);
          const planningAreaName = feature.properties?.name || '';

          // Handle both Polygon and MultiPolygon
          let positions: any;
          if (feature.geometry?.type === 'MultiPolygon') {
            // For MultiPolygon, convert first polygon
            positions = feature.geometry.coordinates[0][0].map((coord: [number, number]) => [coord[1], coord[0]]);
          } else {
            // For Polygon
            positions = feature.geometry?.coordinates?.[0]?.map((coord: [number, number]) => [coord[1], coord[0]]) || [];
          }

          return (
            <Polygon
              key={`aq-polygon-${index}`}
              positions={positions}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.18,
                color: color,
                weight: 1,
                opacity: 0.4,
              }}
              eventHandlers={{
                click: () => {
                  if (onAreaClick) {
                    onAreaClick(planningAreaName, region);
                  }
                },
              }}
            />
          );
        })}

        {/* Animated particle markers - one per planning area */}
        {geoData.features.map((feature: any, index: number) => {
          const region = feature.properties?.region || 'central';
          const pm25Reading = data.pollution.pm25.find((r) => r.region === region);
          if (!pm25Reading) {
            console.warn(`No PM2.5 reading for region: ${region}`, feature.properties?.name);
            return null;
          }

          const pm25 = pm25Reading.pm25;
          const color = getAQColor(pm25);
          const label = getAQLabel(pm25);
          const planningAreaName = feature.properties?.name || '';
          const center = getPolygonCenter(feature.geometry);

          // Skip if center calculation failed
          if (!center) {
            console.warn(`Failed to calculate center for: ${planningAreaName}`, feature.geometry?.coordinates);
            return null;
          }

          // More particles for worse air quality - enhanced visibility
          const particleCount = Math.min(Math.floor(pm25 / 8) + 4, 10);
          const particleSize = Math.min(pm25 / 8 + 3, 6);

          // Create floating particle effect - enhanced visibility
          const createParticles = () => {
            const particles = [];
            for (let i = 0; i < particleCount; i++) {
              const angle = (i / particleCount) * 360;
              const distance = 25 + (i % 3) * 10;
              const duration = 2.5 + (i % 3) * 0.4;
              const delay = i * 0.25;

              particles.push(`
                <!-- Particle with enhanced glow -->
                <g>
                  <!-- Outer glow -->
                  <circle cx="40" cy="40" r="${particleSize + 3}" fill="${color}" opacity="0.2" filter="blur(4px)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; ${Math.cos(angle * Math.PI / 180) * distance},${Math.sin(angle * Math.PI / 180) * distance}; 0,0"
                      dur="${duration}s"
                      begin="${delay}s"
                      repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0;0.4;0" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                  </circle>
                  <!-- White halo for contrast -->
                  <circle cx="40" cy="40" r="${particleSize + 1}" fill="rgba(255, 255, 255, 0.8)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; ${Math.cos(angle * Math.PI / 180) * distance},${Math.sin(angle * Math.PI / 180) * distance}; 0,0"
                      dur="${duration}s"
                      begin="${delay}s"
                      repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0;0.9;0" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                  </circle>
                  <!-- Main particle -->
                  <circle cx="40" cy="40" r="${particleSize}" fill="${color}">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; ${Math.cos(angle * Math.PI / 180) * distance},${Math.sin(angle * Math.PI / 180) * distance}; 0,0"
                      dur="${duration}s"
                      begin="${delay}s"
                      repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0;1;0" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                  </circle>
                </g>
              `);
            }
            return particles.join('');
          };

          const aqIcon = L.divIcon({
            html: `
              <div style="position: relative; width: 80px; height: 80px;">
                <svg width="80" height="80" style="position: absolute; top: 0; left: 0;">
                  <!-- Floating particles -->
                  ${createParticles()}

                  <!-- Pulsing rings with white stroke for visibility -->
                  <circle cx="40" cy="40" r="18" fill="none" stroke="rgba(255, 255, 255, 0.6)" stroke-width="3" opacity="0.6">
                    <animate attributeName="r" from="12" to="30" dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="40" cy="40" r="18" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.6">
                    <animate attributeName="r" from="12" to="30" dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.9" to="0" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="40" cy="40" r="18" fill="none" stroke="rgba(255, 255, 255, 0.6)" stroke-width="3" opacity="0.6">
                    <animate attributeName="r" from="12" to="30" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="40" cy="40" r="18" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.6">
                    <animate attributeName="r" from="12" to="30" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.9" to="0" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
                  </circle>

                  <!-- Central glow - enhanced -->
                  <circle cx="40" cy="40" r="17" fill="${color}" opacity="0.3" filter="blur(6px)"/>

                  <!-- Main circle with shadow -->
                  <circle cx="40" cy="40" r="14" fill="white" stroke="${color}" stroke-width="3.5"/>

                  <!-- PM2.5 value -->
                  <text x="40" y="43" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">
                    ${pm25.toFixed(0)}
                  </text>
                </svg>
              </div>
            `,
            className: 'aq-marker-icon',
            iconSize: [80, 80],
            iconAnchor: [40, 40],
          });

          return (
            <Marker
              key={`aq-marker-${index}`}
              position={center}
              icon={aqIcon}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {planningAreaName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'capitalize' }}>
                    {region} Region
                  </div>
                  <div style={{ color: color, fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                    PM2.5: {pm25} μg/m³
                  </div>
                  <div style={{ fontSize: '11px', color: color, fontWeight: '600' }}>
                    {label}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }

  // Rainfall overlay with animated droplets
  if (layer === 'rainfall' && data.rainfall?.readings && data.rainfall?.stations) {
    // Get rainfall color based on amount
    const getRainfallColor = (rainfall: number) => {
      if (rainfall === 0) return '#e0e0e0'; // Gray for no rain
      if (rainfall < 2) return '#bae6fd';   // Light blue
      if (rainfall < 5) return '#7dd3fc';   // Medium blue
      if (rainfall < 10) return '#38bdf8';  // Blue
      if (rainfall < 20) return '#0ea5e9';  // Deep blue
      return '#0369a1';                      // Dark blue
    };

    const getRainfallLabel = (rainfall: number) => {
      if (rainfall === 0) return 'No Rain';
      if (rainfall < 2) return 'Light';
      if (rainfall < 5) return 'Moderate';
      if (rainfall < 10) return 'Heavy';
      return 'Very Heavy';
    };

    return (
      <>
        {/* Gradient overlays for rainfall coverage */}
        {data.rainfall.readings.filter(r => r.value > 0).map((reading, index) => {
          const station = data.rainfall.stations.find((s: any) => s.id === reading.station_id);
          if (!station) return null;

          const rainfall = reading.value;
          const color = getRainfallColor(rainfall);

          return (
            <Circle
              key={`rain-gradient-${index}`}
              center={[station.location.latitude, station.location.longitude]}
              radius={Math.min(1000 + rainfall * 200, 3000)} // Larger area for heavier rain
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.2,
                color: color,
                weight: 0,
              }}
            />
          );
        })}

        {/* Animated rainfall markers */}
        {data.rainfall.readings.map((reading, index) => {
          const station = data.rainfall.stations.find((s: any) => s.id === reading.station_id);
          if (!station) return null;

          const rainfall = reading.value;
          const color = getRainfallColor(rainfall);
          const label = getRainfallLabel(rainfall);

          // Create animated droplet effect
          const createDroplets = () => {
            if (rainfall === 0) return ''; // No animation for no rain

            const dropletCount = Math.min(Math.floor(rainfall / 2) + 3, 8);
            const droplets = [];

            for (let i = 0; i < dropletCount; i++) {
              const delay = i * 0.15;
              const xOffset = (i % 3) * 10 - 10;

              droplets.push(`
                <!-- Droplet -->
                <g opacity="0.8">
                  <ellipse cx="${30 + xOffset}" cy="10" rx="2" ry="4" fill="${color}">
                    <animate attributeName="cy" from="10" to="50" dur="1s" begin="${delay}s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="1s" begin="${delay}s" repeatCount="indefinite"/>
                  </ellipse>
                  <!-- Splash effect at bottom -->
                  <circle cx="${30 + xOffset}" cy="50" r="0" fill="${color}" opacity="0.5">
                    <animate attributeName="r" from="0" to="4" dur="0.3s" begin="${delay + 0.9}s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.6" to="0" dur="0.3s" begin="${delay + 0.9}s" repeatCount="indefinite"/>
                  </circle>
                </g>
              `);
            }
            return droplets.join('');
          };

          const rainIcon = L.divIcon({
            html: `
              <div style="position: relative; width: 60px; height: 60px;">
                <svg width="60" height="60" style="position: absolute; top: 0; left: 0;">
                  <!-- Animated droplets -->
                  ${createDroplets()}

                  <!-- Pulsing ring (only for active rainfall) -->
                  ${rainfall > 0 ? `
                    <circle cx="30" cy="30" r="15" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
                      <animate attributeName="r" from="12" to="22" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
                    </circle>
                  ` : ''}

                  <!-- Central glow -->
                  <circle cx="30" cy="30" r="12" fill="${color}" opacity="0.3" filter="blur(4px)"/>

                  <!-- Main circle -->
                  <circle cx="30" cy="30" r="10" fill="white" stroke="${color}" stroke-width="2.5"/>

                  <!-- Rainfall value -->
                  <text x="30" y="34" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">
                    ${rainfall.toFixed(1)}
                  </text>
                </svg>
              </div>
            `,
            className: 'rain-marker-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 30],
          });

          // Find nearest planning area for this station
          const findNearestArea = () => {
            if (!geoData) return null;

            let nearestArea = null;
            let minDistance = Infinity;

            geoData.features.forEach((feature: any) => {
              // Calculate center of planning area
              const coords = feature.geometry?.type === 'MultiPolygon'
                ? feature.geometry.coordinates[0][0]
                : feature.geometry?.coordinates?.[0];

              if (!coords) return;

              let latSum = 0, lngSum = 0, count = 0;
              coords.forEach((point: any) => {
                if (Array.isArray(point) && typeof point[0] === 'number') {
                  lngSum += point[0];
                  latSum += point[1];
                  count++;
                }
              });

              if (count === 0) return;

              const centerLat = latSum / count;
              const centerLng = lngSum / count;

              // Calculate distance to station
              const distance = Math.sqrt(
                Math.pow(centerLat - station.location.latitude, 2) +
                Math.pow(centerLng - station.location.longitude, 2)
              );

              if (distance < minDistance) {
                minDistance = distance;
                nearestArea = {
                  name: feature.properties?.name,
                  id: feature.properties?.id,
                  region: feature.properties?.region
                };
              }
            });

            return nearestArea;
          };

          const nearestArea = findNearestArea();

          return (
            <Marker
              key={`rain-${index}`}
              position={[station.location.latitude, station.location.longitude]}
              icon={rainIcon}
              eventHandlers={{
                click: () => {
                  if (nearestArea && onAreaClick) {
                    onAreaClick(nearestArea.name, nearestArea.region, nearestArea.id);
                  }
                }
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {station.name || station.id}
                  </div>
                  <div style={{ color: color, fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                    {rainfall.toFixed(1)} mm
                  </div>
                  <div style={{ fontSize: '11px', color: color, fontWeight: '600', marginBottom: '2px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    5-min total
                  </div>
                  {nearestArea && (
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
                      Click to view {nearestArea.name}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }

  return null;
}
