// Rainfall particle effect - realistic rain simulation based on intensity
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

export function RainfallParticles({ planningAreaId }: Props) {
  const particlesRef = useRef<THREE.Points>(null);
  const { data } = useEnvironmentStore();
  const [buildingBounds, setBuildingBounds] = useState<{ minX: number; maxX: number; minZ: number; maxZ: number } | null>(null);

  // Create circular particle texture (same as HeatParticles)
  const raindropTexture = useMemo(() => {
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

  // Create rain particle system
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!data?.rainfall?.readings || !data?.rainfall?.stations || !buildingBounds) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { stations, readings } = data.rainfall;

    const { minX, maxX, minZ, maxZ } = buildingBounds;
    const areaWidth = maxX - minX;
    const areaHeight = maxZ - minZ;

    const centerLat = 1.3521;
    const centerLng = 103.8198;
    const scale = 111000;

    // IDW interpolation for rainfall at position
    const getRainfallAt = (x: number, z: number): number => {
      let weightedRain = 0;
      let totalWeight = 0;

      readings.forEach(reading => {
        const station = stations.find((s: any) => s.station_id === reading.station_id);
        if (!station) return;

        const stationX = (station.location.longitude - centerLng) * scale;
        const stationZ = (station.location.latitude - centerLat) * scale;

        const dx = x - stationX;
        const dz = z - stationZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        const weight = distance < 100 ? 1000 : 1 / (distance * distance);
        weightedRain += reading.value * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? weightedRain / totalWeight : 0;
    };

    // Calculate average rainfall for the area
    let totalRainfall = 0;
    const samplePoints = 25;
    for (let i = 0; i < samplePoints; i++) {
      const x = minX + Math.random() * areaWidth;
      const z = minZ + Math.random() * areaHeight;
      totalRainfall += getRainfallAt(x, z);
    }
    const avgRainfall = totalRainfall / samplePoints;

    console.log(`Rainfall for ${planningAreaId}: ${avgRainfall.toFixed(2)} mm`);

    // Adjust particle count based on rainfall intensity
    // Light rain: fewer particles, Heavy rain: many particles
    let particleMultiplier = 1;
    if (avgRainfall < 2) {
      particleMultiplier = 0.5; // Light rain
    } else if (avgRainfall < 5) {
      particleMultiplier = 1; // Moderate
    } else if (avgRainfall < 10) {
      particleMultiplier = 2; // Heavy
    } else {
      particleMultiplier = 3; // Very heavy
    }

    const baseParticles = 2000;
    const totalParticles = Math.floor(baseParticles * particleMultiplier);

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const velocities = new Float32Array(totalParticles * 3);
    const initialPositions = new Float32Array(totalParticles * 3);

    // Color based on rainfall intensity - matching 2D layer
    let r, g, b;
    if (avgRainfall === 0) {
      r = 0xe0 / 255; g = 0xe0 / 255; b = 0xe0 / 255; // Gray
    } else if (avgRainfall < 2) {
      r = 0xba / 255; g = 0xe6 / 255; b = 0xfd / 255; // Light blue
    } else if (avgRainfall < 5) {
      r = 0x7d / 255; g = 0xd3 / 255; b = 0xfc / 255; // Medium blue
    } else if (avgRainfall < 10) {
      r = 0x38 / 255; g = 0xbd / 255; b = 0xf8 / 255; // Blue
    } else if (avgRainfall < 20) {
      r = 0x0e / 255; g = 0xa5 / 255; b = 0xe9 / 255; // Deep blue
    } else {
      r = 0x03 / 255; g = 0x69 / 255; b = 0xa1 / 255; // Dark blue
    }

    // Fall speed based on intensity (mm/hour to realistic fall speed)
    const fallSpeed = 50 + avgRainfall * 5; // Faster for heavier rain

    for (let i = 0; i < totalParticles; i++) {
      // Random position across area
      const x = minX + Math.random() * areaWidth;
      const z = minZ + Math.random() * areaHeight;
      const y = 150 + Math.random() * 100; // Start from sky

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = 150 + Math.random() * 100;
      initialPositions[i * 3 + 2] = z;

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Vertical fall with slight horizontal drift (wind effect)
      velocities[i * 3] = (Math.random() - 0.5) * 2; // Slight horizontal drift
      velocities[i * 3 + 1] = -fallSpeed; // Downward
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    console.log(`Created ${totalParticles} rain particles (${avgRainfall.toFixed(1)}mm, speed: ${fallSpeed})`);

    return { positions, colors, velocities, initialPositions };
  }, [data, buildingBounds, planningAreaId]);

  // Animate rain falling
  useFrame((state, delta) => {
    if (!particlesRef.current || !buildingBounds) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const { minX, maxX, minZ, maxZ } = buildingBounds;

    for (let i = 0; i < positions.length / 3; i++) {
      // Move particle
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Reset when hits ground or goes out of bounds
      if (
        positions[i * 3 + 1] < 0 ||
        positions[i * 3] < minX || positions[i * 3] > maxX ||
        positions[i * 3 + 2] < minZ || positions[i * 3 + 2] > maxZ
      ) {
        // Respawn at top with new random position
        positions[i * 3] = minX + Math.random() * (maxX - minX);
        positions[i * 3 + 1] = initialPositions[i * 3 + 1];
        positions[i * 3 + 2] = minZ + Math.random() * (maxZ - minZ);
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
        size={8}
        vertexColors={true}
        transparent={true}
        opacity={0.9}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        map={raindropTexture}
      />
    </points>
  );
}
