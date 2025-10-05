// Air quality (PM2.5) particle effect - uses regional data (north/south/east/west/central)
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface Building {
  footprint: [number, number][];
  height: number;
}

interface BuildingData {
  planningArea: string;
  id: string;
  buildingCount: number;
  buildings: Building[];
}

interface Props {
  planningAreaId: string;
}

// Map planning areas to Singapore regions
const getRegionForArea = (areaId: string): 'north' | 'south' | 'east' | 'west' | 'central' => {
  // Choa Chu Kang is in the west
  const westAreas = ['choa-chu-kang', 'bukit-batok', 'bukit-panjang', 'jurong-west', 'jurong-east'];
  const northAreas = ['woodlands', 'sembawang', 'yishun', 'ang-mo-kio'];
  const eastAreas = ['bedok', 'tampines', 'pasir-ris', 'changi'];
  const centralAreas = ['downtown-core', 'orchard', 'newton', 'bukit-timah'];

  if (westAreas.includes(areaId)) return 'west';
  if (northAreas.includes(areaId)) return 'north';
  if (eastAreas.includes(areaId)) return 'east';
  if (centralAreas.includes(areaId)) return 'central';
  return 'central'; // default
};

export function AirQualityParticles({ planningAreaId }: Props) {
  const particlesRef = useRef<THREE.Points>(null);
  const { data } = useEnvironmentStore();
  const [buildingBounds, setBuildingBounds] = useState<{ minX: number; maxX: number; minZ: number; maxZ: number } | null>(null);

  // Create circular particle texture
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Load building data to get bounds
  useEffect(() => {
    const loadBuildingBounds = async () => {
      try {
        const response = await fetch(`/buildings/${planningAreaId}.json`);
        if (!response.ok) return;

        const buildingData: BuildingData = await response.json();

        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        buildingData.buildings.forEach(building => {
          building.footprint.forEach(([x, z]) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
          });
        });

        setBuildingBounds({ minX, maxX, minZ, maxZ });
      } catch (error) {
        console.error('Failed to load building bounds:', error);
      }
    };

    loadBuildingBounds();
  }, [planningAreaId]);

  // Create particle cloud within building bounds
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!data?.pollution?.pm25 || !buildingBounds) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    // Get regional PM2.5 value
    const region = getRegionForArea(planningAreaId);
    const regionData = data.pollution.pm25.find((r: any) => r.region === region);
    const pm25 = regionData?.pm25 || 25; // default moderate value

    console.log(`Air Quality for ${planningAreaId} (${region}): PM2.5 = ${pm25} μg/m³`);

    const { minX, maxX, minZ, maxZ } = buildingBounds;
    const areaWidth = maxX - minX;
    const areaHeight = maxZ - minZ;

    // Grid-based distribution
    const gridSize = 20;
    const layers = 10;
    const totalParticles = gridSize * gridSize * layers;

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const velocities = new Float32Array(totalParticles * 3);
    const initialPositions = new Float32Array(totalParticles * 3);

    const spacingX = areaWidth / gridSize;
    const spacingZ = areaHeight / gridSize;
    const spacingY = 120 / layers;

    // Color based on PM2.5 level - matching 2D layer exactly
    let r, g, b;
    if (pm25 < 12) {
      // Good - Green (#10b981)
      r = 0x10 / 255; g = 0xb9 / 255; b = 0x81 / 255;
    } else if (pm25 < 35) {
      // Moderate - Yellow (#fbbf24)
      r = 0xfb / 255; g = 0xbf / 255; b = 0x24 / 255;
    } else if (pm25 < 55) {
      // Unhealthy for sensitive - Orange (#f97316)
      r = 0xf9 / 255; g = 0x73 / 255; b = 0x16 / 255;
    } else {
      // Unhealthy - Red (#ef4444)
      r = 0xef / 255; g = 0x44 / 255; b = 0x44 / 255;
    }

    let i = 0;
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const baseX = minX + (gx / gridSize) * areaWidth;
        const baseZ = minZ + (gz / gridSize) * areaHeight;

        for (let layer = 0; layer < layers; layer++) {
          const x = baseX + (Math.random() - 0.5) * spacingX;
          const y = 5 + layer * spacingY + Math.random() * 10;
          const z = baseZ + (Math.random() - 0.5) * spacingZ;

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          initialPositions[i * 3] = x;
          initialPositions[i * 3 + 1] = y;
          initialPositions[i * 3 + 2] = z;

          // Use regional color for all particles
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;

          // Slower drift for pollution particles (heavier than heat)
          velocities[i * 3] = (Math.random() - 0.5) * 0.3;
          velocities[i * 3 + 1] = Math.random() * 0.5 + 0.2; // Slow upward drift
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

          i++;
        }
      }
    }

    console.log(`Created ${totalParticles} PM2.5 particles in ${gridSize}x${gridSize}x${layers} grid`);

    return { positions, colors, velocities, initialPositions };
  }, [data, buildingBounds, planningAreaId]);

  // Animate particles with slow drift
  useFrame((state, delta) => {
    if (!particlesRef.current || !buildingBounds) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const { minX, maxX, minZ, maxZ } = buildingBounds;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 10;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 10;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 10;

      // Reset when particle goes too high or out of bounds
      if (
        positions[i * 3 + 1] > 150 ||
        positions[i * 3] < minX || positions[i * 3] > maxX ||
        positions[i * 3 + 2] < minZ || positions[i * 3 + 2] > maxZ
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
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={10}
        vertexColors={true}
        transparent={true}
        opacity={0.85}
        sizeAttenuation={true}
        blending={THREE.NormalBlending}
        depthWrite={false}
        map={particleTexture}
      />
    </points>
  );
}
