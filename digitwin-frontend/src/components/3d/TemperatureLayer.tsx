// Temperature heatmap visualization layer with interpolated grid
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMemo } from 'react';
import * as THREE from 'three';
import { latLngToLocal, createInterpolatedGrid } from '../../utils/interpolation';

export function TemperatureLayer() {
  const { data } = useEnvironmentStore();

  const { dataPoints, grid } = useMemo(() => {
    if (!data?.temperature?.readings || !data?.temperature?.stations)
      return { dataPoints: [], grid: null };

    // Convert station readings to local coordinates
    const dataPoints = data.temperature.readings.map((reading) => {
      const station = data.temperature.stations.find((s: any) => s.id === reading.station_id);
      if (!station) return null;

      const { x, z } = latLngToLocal(station.location.latitude, station.location.longitude);
      return { x, z, value: reading.value, station: station.name || station.id };
    }).filter(Boolean) as any[];

    // Create interpolated grid (20x20 grid covering Singapore)
    const bounds = {
      minX: -3500,
      maxX: 3500,
      minZ: -3500,
      maxZ: 3500,
    };

    const gridSize = 20;
    const interpolatedGrid = createInterpolatedGrid(dataPoints, gridSize, bounds);

    return {
      dataPoints,
      grid: { data: interpolatedGrid, size: gridSize, bounds }
    };
  }, [data]);

  // Helper function to get temperature color
  const getTempColor = (temp: number) => {
    const normalizedTemp = Math.max(0, Math.min(1, (temp - 24) / 10)); // 24-34°C range
    const color = new THREE.Color();

    if (normalizedTemp < 0.33) {
      color.lerpColors(
        new THREE.Color(0x3b82f6),
        new THREE.Color(0x10b981),
        normalizedTemp / 0.33
      );
    } else if (normalizedTemp < 0.66) {
      color.lerpColors(
        new THREE.Color(0x10b981),
        new THREE.Color(0xfbbf24),
        (normalizedTemp - 0.33) / 0.33
      );
    } else {
      color.lerpColors(
        new THREE.Color(0xfbbf24),
        new THREE.Color(0xef4444),
        (normalizedTemp - 0.66) / 0.34
      );
    }

    return color;
  };

  if (!grid) return null;

  const { data: gridData, size, bounds } = grid;
  const stepX = (bounds.maxX - bounds.minX) / (size - 1);
  const stepZ = (bounds.maxZ - bounds.minZ) / (size - 1);
  const cellSize = stepX * 0.95; // Slightly smaller to avoid overlap

  return (
    <group>
      {/* Interpolated temperature grid */}
      {gridData.map((row, i) =>
        row.map((temp, j) => {
          const x = bounds.minX + i * stepX;
          const z = bounds.minZ + j * stepZ;
          const color = getTempColor(temp);

          return (
            <mesh key={`${i}-${j}`} position={[x, 5, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[cellSize, cellSize]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.6}
                depthWrite={false}
              />
            </mesh>
          );
        })
      )}

      {/* Station markers */}
      {dataPoints.map((point: any, index) => (
        <mesh key={`marker-${index}`} position={[point.x, 30, point.z]}>
          <sphereGeometry args={[80, 16, 16]} />
          <meshStandardMaterial
            color={getTempColor(point.value)}
            emissive={getTempColor(point.value)}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
