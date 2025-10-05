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

  return (
    <group>
      {/* Interpolated rainfall grid */}
      {gridData.map((row, i) =>
        row.map((rainfall, j) => {
          if (rainfall < 0.1) return null; // Skip cells with no rainfall

          const x = bounds.minX + i * stepX;
          const z = bounds.minZ + j * stepZ;
          const color = getRainColor(rainfall);
          const height = 50 + rainfall * 30;

          return (
            <mesh key={`${i}-${j}`} position={[x, height / 2, z]}>
              <cylinderGeometry args={[cellSize / 2, cellSize / 2, height, 12]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.5}
                emissive={color}
                emissiveIntensity={0.2}
              />
            </mesh>
          );
        })
      )}

      {/* Station markers with rainfall */}
      {dataPoints.map((point: any, index) => {
        const color = getRainColor(point.value);
        const height = 100 + point.value * 50;

        return (
          <group key={`marker-${index}`} position={[point.x, height / 2, point.z]}>
            <mesh>
              <cylinderGeometry args={[100, 100, height, 16]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.7}
                emissive={color}
                emissiveIntensity={0.3}
              />
            </mesh>
            <mesh position={[0, height / 2 + 50, 0]}>
              <sphereGeometry args={[80, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
