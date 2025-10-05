// Temperature heatmap overlay for 3D view
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface Props {
  planningAreaId: string;
}

export function TemperatureHeatmap({ planningAreaId }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { data } = useEnvironmentStore();

  // Generate heatmap texture using IDW interpolation
  const heatmapTexture = useMemo(() => {
    if (!data?.temperature) return null;

    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { stations, readings } = data.temperature;

    // Singapore bounds
    const minLat = 1.15, maxLat = 1.48;
    const minLng = 103.6, maxLng = 104.0;

    // Fixed temperature range for consistent colors
    const minTemp = 26;
    const maxTemp = 34;

    // Create image data for pixel-level control
    const imageData = ctx.createImageData(size, size);

    // IDW interpolation for each pixel
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const lng = minLng + (px / size) * (maxLng - minLng);
        const lat = maxLat - (py / size) * (maxLat - minLat);

        let weightedTemp = 0;
        let totalWeight = 0;

        readings.forEach(reading => {
          const station = stations.find(s => s.station_id === reading.station_id);
          if (!station) return;

          const dlat = lat - station.location.latitude;
          const dlng = lng - station.location.longitude;
          const distance = Math.sqrt(dlat * dlat + dlng * dlng);

          const weight = distance < 0.001 ? 1000 : 1 / (distance * distance);
          weightedTemp += reading.value * weight;
          totalWeight += weight;
        });

        const temp = totalWeight > 0 ? weightedTemp / totalWeight : minTemp;
        const normalizedTemp = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));

        let r, g, b;
        if (normalizedTemp < 0.2) {
          const t = normalizedTemp / 0.2;
          r = 0;
          g = Math.floor(t * 200);
          b = 255;
        } else if (normalizedTemp < 0.4) {
          const t = (normalizedTemp - 0.2) / 0.2;
          r = 0;
          g = 200 + Math.floor(t * 55);
          b = Math.floor((1 - t) * 255);
        } else if (normalizedTemp < 0.6) {
          const t = (normalizedTemp - 0.4) / 0.2;
          r = Math.floor(t * 255);
          g = 255;
          b = 0;
        } else if (normalizedTemp < 0.8) {
          const t = (normalizedTemp - 0.6) / 0.2;
          r = 255;
          g = 255 - Math.floor(t * 100);
          b = 0;
        } else {
          const t = (normalizedTemp - 0.8) / 0.2;
          r = 255;
          g = 155 - Math.floor(t * 155);
          b = 0;
        }

        const idx = (py * size + px) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 180;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [data]);

  // Animate heatmap (pulsing effect)
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 0.5) * 0.05 + 0.95;
      meshRef.current.material.opacity = pulse * 0.5;
    }
  });

  if (!heatmapTexture) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 5, 0]}
      receiveShadow={false}
      renderOrder={1}
    >
      <planeGeometry args={[5000, 5000]} />
      <meshBasicMaterial
        map={heatmapTexture}
        transparent={true}
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
