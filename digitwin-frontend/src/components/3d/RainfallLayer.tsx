// Rainfall visualization layer with interpolated coverage
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMemo } from 'react';
import * as THREE from 'three';
import { latLngToLocal, createInterpolatedGrid } from '../../utils/interpolation';

export function RainfallLayer() {
  const { data } = useEnvironmentStore();

  const { dataPoints, grid } = useMemo(() => {
    if (!data?.rainfall?.readings || !data?.rainfall?.stations)
      return { dataPoints: [], grid: null };

    // Convert all station readings (including zero rainfall)
    const dataPoints = data.rainfall.readings.map((reading) => {
      const station = data.rainfall.stations.find((s: any) => s.id === reading.station_id);
      if (!station) return null;

      const { x, z } = latLngToLocal(station.location.latitude, station.location.longitude);
      return { x, z, value: reading.value, station: station.name || station.id };
    }).filter(Boolean) as any[];

    // Create interpolated grid
    const bounds = { minX: -3500, maxX: 3500, minZ: -3500, maxZ: 3500 };
    const gridSize = 20;
    const interpolatedGrid = createInterpolatedGrid(dataPoints, gridSize, bounds);

    return {
      dataPoints: dataPoints.filter((p: any) => p.value > 0), // Only show markers with rain
      grid: { data: interpolatedGrid, size: gridSize, bounds }
    };
  }, [data]);

  const getRainColor = (rainfall: number) => {
    const normalizedRain = Math.max(0, Math.min(1, rainfall / 10));
    const color = new THREE.Color();
    color.lerpColors(
      new THREE.Color(0xbae6fd),
      new THREE.Color(0x0369a1),
      normalizedRain
    );
    return color;
  };

  if (!grid) return null;

  const { data: gridData, size, bounds } = grid;
  const stepX = (bounds.maxX - bounds.minX) / (size - 1);
  const stepZ = (bounds.maxZ - bounds.minZ) / (size - 1);
  const cellSize = stepX * 0.95;

  return null;
}
