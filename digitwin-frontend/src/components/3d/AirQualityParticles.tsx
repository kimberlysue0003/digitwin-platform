// Air quality (PM2.5) particle effect - uses regional data (north/south/east/west/central)
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMapBounds } from '../../hooks/useMapBounds';
import { PLANNING_AREAS } from '../../data/planningAreas';

interface Props {
  planningAreaId: string;
}

// Map planning areas to Singapore regions
const AREA_REGION_MAP: Record<string, 'north' | 'south' | 'east' | 'west' | 'central'> = PLANNING_AREAS.reduce((acc, area) => {
  acc[area.id] = area.region;
  return acc;
}, {} as Record<string, 'north' | 'south' | 'east' | 'west' | 'central'>);

export function AirQualityParticles({ planningAreaId }: Props) {
  const particlesRef = useRef<THREE.Points>(null);
  const { data } = useEnvironmentStore();
  const mapBounds = useMapBounds(planningAreaId);

  const regionPm25 = useMemo(() => {
    if (!data?.pollution?.pm25) return null;

    const region = AREA_REGION_MAP[planningAreaId] ?? 'central';
    const regionData = data.pollution.pm25.find((r: any) => r.region === region);

    return regionData?.pm25 ?? null;
  }, [data, planningAreaId]);

  // Create solid circular particle texture (matching temperature effect)
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }, []);
  // Create particle cloud aligned with map texture similar to temperature particles
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!mapBounds.isLoaded || regionPm25 === null) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { width, height, textureWidth, textureHeight, isNonTransparent } = mapBounds;
    const pm25 = regionPm25;

    // Particle density and layering to mirror temperature effect
    const particleDensity = 0.0003;
    const estimatedParticles = Math.floor(width * height * particleDensity);
    const layers = 10;

    const tempPositions: number[] = [];
    const tempColors: number[] = [];
    const tempVelocities: number[] = [];
    const tempInitialPositions: number[] = [];

    let attempts = 0;
    const maxAttempts = estimatedParticles * 5;

    while (tempPositions.length / 3 < estimatedParticles && attempts < maxAttempts) {
      attempts++;

      const x = (Math.random() - 0.5) * width;
      const z = (Math.random() - 0.5) * height;

      const u = (x + width / 2) / width;
      const v = (z + height / 2) / height;
      const texX = Math.floor(u * textureWidth);
      const texY = Math.floor(v * textureHeight);

      if (!isNonTransparent(texX, texY)) continue;

      for (let layer = 0; layer < layers; layer++) {
        const particleY = layer * 12 + Math.random() * 10;

        tempPositions.push(x, particleY, z);
        tempInitialPositions.push(x, particleY, z);

        // EPA AQI color mapping (matches DataCards.tsx and EPA 2024 standards)
        let r: number, g: number, b: number;
        if (pm25 >= 250.5) {
          // Hazardous (301+ AQI): maroon/brown-red #7e1e22
          r = 0x7e / 255;
          g = 0x1e / 255;
          b = 0x22 / 255;
        } else if (pm25 >= 150.5) {
          // Very Unhealthy (201-300 AQI): purple #9333ea
          r = 0x93 / 255;
          g = 0x33 / 255;
          b = 0xea / 255;
        } else if (pm25 >= 55.5) {
          // Unhealthy (151-200 AQI): red #ef4444
          r = 0xef / 255;
          g = 0x44 / 255;
          b = 0x44 / 255;
        } else if (pm25 >= 35) {
          // Unhealthy for Sensitive Groups (101-150 AQI): orange #f97316
          r = 0xf9 / 255;
          g = 0x73 / 255;
          b = 0x16 / 255;
        } else if (pm25 >= 25) {
          // Moderate (51-100 AQI): yellow #facc15
          r = 0xfa / 255;
          g = 0xcc / 255;
          b = 0x15 / 255;
        } else if (pm25 >= 12) {
          // Moderate (51-100 AQI): yellow-green #84cc16
          r = 0x84 / 255;
          g = 0xcc / 255;
          b = 0x16 / 255;
        } else {
          // Good (0-50 AQI): green #16a34a
          r = 0x16 / 255;
          g = 0xa3 / 255;
          b = 0x4a / 255;
        }

        tempColors.push(r, g, b);

        // Pollution particles drift more slowly upward with mild turbulence
        tempVelocities.push(
          (Math.random() - 0.5) * 0.6,
          Math.max(0.2, (pm25 - 20) * 0.02) + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.6
        );
      }

      if (tempPositions.length / 3 >= estimatedParticles) break;
    }

    const positions = new Float32Array(tempPositions);
    const colors = new Float32Array(tempColors);
    const velocities = new Float32Array(tempVelocities);
    const initialPositions = new Float32Array(tempInitialPositions);

    console.log(`Created ${positions.length / 3} PM2.5 particles at ${pm25.toFixed(1)} μg/m³`);

    return { positions, colors, velocities, initialPositions };
  }, [mapBounds, regionPm25]);

  // Animate particles similar to temperature but with pollution-specific reset behaviour
  useFrame((state, delta) => {
    if (!particlesRef.current || !mapBounds.isLoaded) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const halfWidth = mapBounds.width / 2;
    const halfHeight = mapBounds.height / 2;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 10;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 10;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 10;

      if (
        positions[i * 3 + 1] > 140 ||
        positions[i * 3] < -halfWidth || positions[i * 3] > halfWidth ||
        positions[i * 3 + 2] < -halfHeight || positions[i * 3 + 2] > halfHeight
      ) {
        positions[i * 3] = initialPositions[i * 3];
        positions[i * 3 + 1] = initialPositions[i * 3 + 1];
        positions[i * 3 + 2] = initialPositions[i * 3 + 2];
      }
    }

    positionsAttr.needsUpdate = true;
  });

  if (positions.length === 0) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={15}
        vertexColors={true}
        transparent={true}
        opacity={0.9}
        sizeAttenuation={true}
        blending={THREE.NormalBlending}
        depthWrite={false}
        map={particleTexture}
      />
    </points>
  );
}
