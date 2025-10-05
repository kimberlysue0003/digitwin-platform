// Beautiful data visualization cards
import { useEnvironmentStore } from '../stores/environmentStore';
import { useMemo } from 'react';

export function DataCards() {
  const { data, viewMode, selectedPlanningArea } = useEnvironmentStore();

  // Calculate area center coordinates for interpolation (3D view)
  const areaCenter = useMemo(() => {
    if (viewMode !== '3d') return null;

    // Singapore center for coordinate system
    const centerLat = 1.3521;
    const centerLng = 103.8198;

    // Simplified: use planning area center (you can refine this by loading building bounds)
    // For now, assume center at origin for the selected area
    return { x: 0, z: 0, centerLat, centerLng, scale: 111000 };
  }, [viewMode, selectedPlanningArea]);

  if (!data) return null;

  // IDW interpolation function
  const interpolateValue = (stations: any[] | undefined, readings: any[] | undefined, getValue: (r: any) => number) => {
    if (!areaCenter || !stations || !readings || stations.length === 0 || readings.length === 0) return null;

    const { x, z, centerLat, centerLng, scale } = areaCenter;
    let weightedValue = 0;
    let totalWeight = 0;

    readings.forEach((reading: any) => {
      const station = stations.find((s: any) => s.station_id === reading.station_id || s.id === reading.station_id);
      if (!station) return;

      const stationX = (station.location.longitude - centerLng) * scale;
      const stationZ = (station.location.latitude - centerLat) * scale;

      const dx = x - stationX;
      const dz = z - stationZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const weight = distance < 100 ? 1000 : 1 / (distance * distance);
      weightedValue += getValue(reading) * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedValue / totalWeight : null;
  };

  // Calculate statistics based on view mode
  const avgTemp = viewMode === '3d' && data.temperature?.readings && data.temperature?.stations
    ? interpolateValue(data.temperature.stations, data.temperature.readings, (r) => r.value)
    : data.temperature?.readings
    ? (data.temperature.readings.reduce((sum, r) => sum + r.value, 0) / data.temperature.readings.length)
    : null;

  // Debug log
  if (viewMode === '3d') {
    console.log('3D View - DataCards:', {
      selectedArea: selectedPlanningArea,
      hasStations: !!data.temperature?.stations,
      stationCount: data.temperature?.stations?.length,
      hasReadings: !!data.temperature?.readings,
      readingCount: data.temperature?.readings?.length,
      interpolatedTemp: avgTemp,
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

  const totalRainfall = viewMode === '3d' && data.rainfall?.readings
    ? interpolateValue(data.rainfall.stations, data.rainfall.readings, (r) => r.value)
    : data.rainfall?.readings
    ? data.rainfall.readings.reduce((sum, r) => sum + r.value, 0)
    : null;

  const locationLabel = viewMode === '3d'
    ? selectedPlanningArea.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Singapore';

  const cards = [
    {
      title: 'Temperature',
      value: avgTemp ? `${avgTemp.toFixed(1)}°C` : '--',
      icon: '🌡️',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
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
      color: '#ef4444',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
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
