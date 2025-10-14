// Beautiful data visualization cards
import { useEnvironmentStore } from '../stores/environmentStore';
import { useMemo } from 'react';
import { PLANNING_AREAS } from '../data/planningAreas';

export function DataCards() {
  const { data, viewMode, selectedPlanningArea } = useEnvironmentStore();

  // Get temperature color based on value (°C)
  const getTemperatureColor = (temp: number | null): { color: string; bgColor: string; borderColor: string } => {
    if (temp === null) {
      return { color: '#9ca3af', bgColor: '#f9fafb', borderColor: '#e5e7eb' };
    }

    // Temperature color mapping (Singapore typical range: 24-34°C)
    if (temp >= 32) {
      // Very hot: deep red
      return { color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' };
    } else if (temp >= 30) {
      // Hot: red-orange
      return { color: '#ea580c', bgColor: '#fff7ed', borderColor: '#fed7aa' };
    } else if (temp >= 28) {
      // Warm: orange
      return { color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fde68a' };
    } else if (temp >= 26) {
      // Comfortable: yellow-green
      return { color: '#84cc16', bgColor: '#f7fee7', borderColor: '#d9f99d' };
    } else if (temp >= 24) {
      // Cool: green
      return { color: '#10b981', bgColor: '#ecfdf5', borderColor: '#a7f3d0' };
    } else {
      // Cold: blue (rare in Singapore)
      return { color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#bfdbfe' };
    }
  };

  // Get PM2.5 color based on value (μg/m³) - EPA AQI standard with extended ranges
  const getPM25Color = (pm25: number | null): { color: string; bgColor: string; borderColor: string } => {
    if (pm25 === null) {
      return { color: '#9ca3af', bgColor: '#f9fafb', borderColor: '#e5e7eb' };
    }

    // PM2.5 color mapping based on EPA AQI standards (2024)
    if (pm25 >= 250.5) {
      // Hazardous (301+ AQI): maroon/brown-red
      return { color: '#7e1e22', bgColor: '#fef2f2', borderColor: '#fca5a1' };
    } else if (pm25 >= 150.5) {
      // Very Unhealthy (201-300 AQI): purple
      return { color: '#9333ea', bgColor: '#faf5ff', borderColor: '#e9d5ff' };
    } else if (pm25 >= 55.5) {
      // Unhealthy (151-200 AQI): red
      return { color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' };
    } else if (pm25 >= 35) {
      // Unhealthy for Sensitive Groups (101-150 AQI): orange
      return { color: '#f97316', bgColor: '#fff7ed', borderColor: '#fed7aa' };
    } else if (pm25 >= 25) {
      // Moderate (51-100 AQI): yellow
      return { color: '#facc15', bgColor: '#fefce8', borderColor: '#fef08a' };
    } else if (pm25 >= 12) {
      // Moderate (51-100 AQI): yellow-green
      return { color: '#84cc16', bgColor: '#f7fee7', borderColor: '#d9f99d' };
    } else {
      // Good (0-50 AQI): green
      return { color: '#16a34a', bgColor: '#f0fdf4', borderColor: '#bbf7d0' };
    }
  };

  // Calculate area center coordinates for interpolation (3D view)
  const areaCenter = useMemo(() => {
    if (viewMode !== '3d' || !selectedPlanningArea) return null;

    // Find the selected planning area to get its actual center
    const currentArea = PLANNING_AREAS.find(pa => pa.id === selectedPlanningArea);
    if (!currentArea) return null;

    // Use the actual planning area's center coordinates
    const [areaLat, areaLng] = currentArea.center;

    // Singapore center for coordinate system
    const centerLat = 1.3521;
    const centerLng = 103.8198;
    const scale = 111000; // meters per degree

    // Calculate the area's position relative to Singapore center
    const x = (areaLng - centerLng) * scale;
    const z = (areaLat - centerLat) * scale;

    return { x, z, centerLat, centerLng, scale };
  }, [viewMode, selectedPlanningArea]);

  if (!data) return null;

  // IDW interpolation function with distance-based filtering
  const interpolateValue = (stations: any[] | undefined, readings: any[] | undefined, getValue: (r: any) => number) => {
    if (!areaCenter || !stations || !readings || stations.length === 0 || readings.length === 0) {
      console.log('❌ IDW Interpolation skipped:', {
        hasAreaCenter: !!areaCenter,
        hasStations: !!stations,
        hasReadings: !!readings,
        stationCount: stations?.length,
        readingCount: readings?.length
      });
      return null;
    }

    const { x, z, centerLat, centerLng, scale } = areaCenter;
    let weightedValue = 0;
    let totalWeight = 0;
    const contributingStations: any[] = [];

    readings.forEach((reading: any) => {
      const station = stations.find((s: any) => s.station_id === reading.station_id || s.id === reading.station_id);
      if (!station) return;

      const stationX = (station.location.longitude - centerLng) * scale;
      const stationZ = (station.location.latitude - centerLat) * scale;

      const dx = x - stationX;
      const dz = z - stationZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Only consider stations within 10km (10000m)
      // Use power of 3 for stronger distance decay
      const maxInfluenceDistance = 10000; // 10km
      if (distance > maxInfluenceDistance) return;

      // IDW with power=3 for stronger decay
      const weight = 1 / Math.pow(Math.max(distance, 100), 3);
      weightedValue += getValue(reading) * weight;
      totalWeight += weight;

      contributingStations.push({
        id: station.station_id,
        value: getValue(reading).toFixed(2),
        distance: distance.toFixed(0) + 'm',
        weight: weight.toExponential(2)
      });
    });

    const result = totalWeight > 0 ? weightedValue / totalWeight : null;

    console.log('✅ IDW Interpolation result:', {
      areaPos: { x: x.toFixed(0), z: z.toFixed(0) },
      contributingStations,
      totalWeight: totalWeight.toExponential(2),
      result: result?.toFixed(2)
    });

    return result;
  };

  // Calculate statistics based on view mode
  const avgTemp = viewMode === '3d' && data.temperature?.readings && data.temperature?.stations
    ? interpolateValue(data.temperature.stations, data.temperature.readings, (r) => r.value)
    : data.temperature?.readings
    ? (data.temperature.readings.reduce((sum, r) => sum + r.value, 0) / data.temperature.readings.length)
    : null;

  // Debug log
  if (viewMode === '3d' && areaCenter) {
    console.log('3D View - DataCards Temperature Calculation:', {
      selectedArea: selectedPlanningArea,
      areaCenter: { x: areaCenter.x.toFixed(0), z: areaCenter.z.toFixed(0) },
      stationCount: data.temperature?.stations?.length || 0,
      readingCount: data.temperature?.readings?.length || 0,
      interpolatedTemp: avgTemp ? avgTemp.toFixed(2) : null,
      allReadings: data.temperature?.readings?.map((r: any) => ({
        station: r.station_id,
        temp: r.value.toFixed(1)
      }))
    });
  }

  const avgWindSpeed = viewMode === '3d' && data.wind?.speed
    ? interpolateValue(data.wind.stations, data.wind.speed, (r) => r.speed)
    : data.wind?.speed
    ? (data.wind.speed.reduce((sum, r) => sum + r.speed, 0) / data.wind.speed.length)
    : null;

  // PM2.5 - use regional value in 3D view
  const avgPM25 = viewMode === '3d' && data.pollution?.pm25 && selectedPlanningArea
    ? (() => {
        // Map planning area to region
        const getRegion = (areaId: string): string => {
          const westAreas = ['choa-chu-kang', 'bukit-batok', 'bukit-panjang', 'jurong-west', 'jurong-east'];
          const northAreas = ['woodlands', 'sembawang', 'yishun', 'ang-mo-kio'];
          const eastAreas = ['bedok', 'tampines', 'pasir-ris', 'changi'];
          const centralAreas = ['downtown-core', 'orchard', 'newton', 'bukit-timah'];
          if (westAreas.includes(areaId)) return 'west';
          if (northAreas.includes(areaId)) return 'north';
          if (eastAreas.includes(areaId)) return 'east';
          if (centralAreas.includes(areaId)) return 'central';
          return 'central';
        };
        const region = getRegion(selectedPlanningArea);
        const regionData = data.pollution.pm25.find((r: any) => r.region === region);
        return regionData?.pm25 || null;
      })()
    : data.pollution?.pm25
    ? (data.pollution.pm25.reduce((sum, r) => sum + r.pm25, 0) / data.pollution.pm25.length)
    : null;

  const totalRainfall = viewMode === '3d' && data.rainfall?.readings && data.rainfall?.stations
    ? (() => {
        // Helper function: Check if station is within area bounds
        const isStationInArea = (station: any, bounds: [[number, number], [number, number]]) => {
          const lat = station.location.latitude;
          const lng = station.location.longitude;
          const [[minLat, minLng], [maxLat, maxLng]] = bounds;
          return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
        };

        // Step 1: Check if there's a weather station within this area's bounds
        const currentArea = PLANNING_AREAS.find(pa => pa.id === selectedPlanningArea);

        if (currentArea) {
          const localStations = data.rainfall.stations.filter((s: any) => isStationInArea(s, currentArea.bounds));
          const localReadings = data.rainfall.readings.filter((r: any) =>
            localStations.some((s: any) => s.station_id === r.station_id)
          );

          // Step 2: If we have local station(s), use their data directly
          if (localReadings.length > 0) {
            return localReadings.reduce((sum: number, r: any) => sum + r.value, 0) / localReadings.length;
          }
          // Step 3: No local station, use IDW interpolation
          else {
            return interpolateValue(data.rainfall.stations, data.rainfall.readings, (r) => r.value);
          }
        }
        return null;
      })()
    : data.rainfall?.readings
    ? data.rainfall.readings.reduce((sum, r) => sum + r.value, 0)
    : null;

  const locationLabel = viewMode === '3d'
    ? selectedPlanningArea.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Singapore';

  // Get dynamic colors based on actual values
  const tempColors = getTemperatureColor(avgTemp);
  const pm25Colors = getPM25Color(avgPM25);

  const cards = [
    {
      title: 'Temperature',
      value: avgTemp ? `${avgTemp.toFixed(1)}°C` : '--',
      icon: '🌡️',
      color: tempColors.color,
      bgColor: tempColors.bgColor,
      borderColor: tempColors.borderColor,
      stations: data.temperature?.readings.length || 0,
    },
    {
      title: 'Wind Speed',
      value: avgWindSpeed ? `${avgWindSpeed.toFixed(1)} kts` : '--',
      icon: '💨',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      stations: data.wind?.speed.length || 0,
    },
    {
      title: 'PM2.5',
      value: avgPM25 ? `${avgPM25.toFixed(1)} μg/m³` : '--',
      icon: '🏭',
      color: pm25Colors.color,
      bgColor: pm25Colors.bgColor,
      borderColor: pm25Colors.borderColor,
      stations: data.pollution?.pm25.length || 0,
    },
    {
      title: 'Rainfall',
      value: totalRainfall ? `${totalRainfall.toFixed(1)} mm` : '--',
      icon: '🌧️',
      color: '#06b6d4',
      bgColor: '#ecfeff',
      borderColor: '#a5f3fc',
      stations: data.rainfall?.readings.length || 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Location header in 3D view */}
      {viewMode === '3d' && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>
            Area
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            {locationLabel}
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
            Interpolated from {data.temperature?.readings.length || 0} stations
          </div>
        </div>
      )}

      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            padding: '14px',
            backgroundColor: card.bgColor,
            borderRadius: '8px',
            border: `1px solid ${card.borderColor}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>{card.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
              {card.title}
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: card.color, marginBottom: '2px' }}>
            {card.value}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
            {card.stations} station{card.stations !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
