// Wind field visualization with interpolated arrow grid
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMemo } from 'react';
import * as THREE from 'three';
import { latLngToLocal, interpolateIDW } from '../../utils/interpolation';

export function WindLayer() {
  const { data } = useEnvironmentStore();

  const { windGrid, stationMarkers } = useMemo(() => {
    if (!data?.wind?.speed || !data?.wind?.direction || !data?.wind?.stations)
      return { windGrid: [], stationMarkers: [] };

    // Convert station data to local coordinates
    const speedPoints = data.wind.speed.map((reading) => {
      const station = data.wind.stations.find((s: any) => s.id === reading.station_id);
      if (!station) return null;
      const { x, z } = latLngToLocal(station.location.latitude, station.location.longitude);
      return { x, z, value: reading.speed };
    }).filter(Boolean) as any[];

    const directionPoints = data.wind.direction.map((reading) => {
      const station = data.wind.stations.find((s: any) => s.id === reading.station_id);
      if (!station) return null;
      const { x, z } = latLngToLocal(station.location.latitude, station.location.longitude);
      return { x, z, value: reading.direction };
    }).filter(Boolean) as any[];

    // Create wind arrow grid
    const bounds = { minX: -3500, maxX: 3500, minZ: -3500, maxZ: 3500 };
    const gridSize = 15;
    const stepX = (bounds.maxX - bounds.minX) / (gridSize - 1);
    const stepZ = (bounds.maxZ - bounds.minZ) / (gridSize - 1);

    const windGrid = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = bounds.minX + i * stepX;
        const z = bounds.minZ + j * stepZ;

        const speed = interpolateIDW(x, z, speedPoints);
        const direction = interpolateIDW(x, z, directionPoints);

        windGrid.push({ x, z, speed, direction });
      }
    }

    // Station markers
    const stationMarkers = data.wind.speed.map((reading) => {
      const station = data.wind.stations.find((s: any) => s.id === reading.station_id);
      const direction = data.wind.direction.find((d) => d.station_id === reading.station_id);
      if (!station || !direction) return null;

      const { x, z } = latLngToLocal(station.location.latitude, station.location.longitude);
      return { x, z, speed: reading.speed, direction: direction.direction };
    }).filter(Boolean) as any[];

    return { windGrid, stationMarkers };
  }, [data]);

  const getWindColor = (speed: number) => {
    const normalizedSpeed = Math.max(0, Math.min(1, speed / 20));
    const color = new THREE.Color();
    color.lerpColors(
      new THREE.Color(0xa5f3fc),
      new THREE.Color(0x0369a1),
      normalizedSpeed
    );
    return color;
  };

  if (windGrid.length === 0) return null;

  return (
    <group>
      {/* Interpolated wind field grid */}
      {windGrid.map((arrow: any, index) => {
        const angleRad = (arrow.direction * Math.PI) / 180;
        const length = 100 + arrow.speed * 15;
        const color = getWindColor(arrow.speed);

        return (
          <group key={index} position={[arrow.x, 100, arrow.z]} rotation={[0, angleRad, 0]}>
            <mesh>
              <cylinderGeometry args={[8, 8, length, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, length / 2 + 20, 0]}>
              <coneGeometry args={[20, 40, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* Station markers (larger arrows) */}
      {stationMarkers.map((marker: any, index) => {
        const angleRad = (marker.direction * Math.PI) / 180;
        const length = 150 + marker.speed * 25;
        const color = getWindColor(marker.speed);

        return (
          <group key={`station-${index}`} position={[marker.x, 100, marker.z]} rotation={[0, angleRad, 0]}>
            <mesh>
              <cylinderGeometry args={[15, 15, length, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, length / 2 + 30, 0]}>
              <coneGeometry args={[30, 60, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
