// Air quality (PM2.5) visualization layer
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMemo } from 'react';
import * as THREE from 'three';

export function AirQualityLayer() {
  const { data } = useEnvironmentStore();

  const regions = useMemo(() => {
    if (!data?.pollution?.pm25) return [];

    // Regional PM2.5 positions (approximate Singapore regions)
    const regionPositions: Record<string, [number, number]> = {
      north: [0, -1500],
      south: [0, 1500],
      east: [1500, 0],
      west: [-1500, 0],
      central: [0, 0],
    };

    return data.pollution.pm25.map((reading) => {
      const [x, z] = regionPositions[reading.region] || [0, 0];
      const pm25 = reading.pm25;

      // PM2.5 color mapping: green (good) -> yellow -> orange -> red (hazardous)
      // 0-12: Good (green)
      // 12-35: Moderate (yellow)
      // 35-55: Unhealthy for sensitive (orange)
      // 55+: Unhealthy (red)
      const normalizedPM25 = Math.max(0, Math.min(1, pm25 / 100));

      const color = new THREE.Color();
      if (pm25 < 12) {
        color.lerpColors(
          new THREE.Color(0x10b981),
          new THREE.Color(0xfbbf24),
          pm25 / 12
        );
      } else if (pm25 < 35) {
        color.lerpColors(
          new THREE.Color(0xfbbf24),
          new THREE.Color(0xf97316),
          (pm25 - 12) / 23
        );
      } else {
        color.lerpColors(
          new THREE.Color(0xf97316),
          new THREE.Color(0xef4444),
          Math.min(1, (pm25 - 35) / 20)
        );
      }

      return { x, z, color, pm25, region: reading.region };
    });
  }, [data]);

  if (regions.length === 0) return null;

  return (
    <group>
      {regions.map((region: any, index) => (
        <mesh key={index} position={[region.x, 10, region.z]}>
          <cylinderGeometry args={[1200, 1200, 20, 32]} />
          <meshBasicMaterial
            color={region.color}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
