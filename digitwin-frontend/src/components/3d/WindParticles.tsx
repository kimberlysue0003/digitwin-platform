// Wind flow particle system for 3D view
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

export function WindParticles({ planningAreaId }: Props) {
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

  // Create wind flow particle system
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!data?.wind || !buildingBounds) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { stations, speed: speedReadings, direction: directionReadings } = data.wind;

    // Use building bounds to distribute particles
    const { minX, maxX, minZ, maxZ } = buildingBounds;
    const areaWidth = maxX - minX;
    const areaHeight = maxZ - minZ;

    // Create grid based on actual area size
    const gridSize = 15;
    const layers = 8;
    const totalParticles = gridSize * gridSize * layers;

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const velocities = new Float32Array(totalParticles * 3);
    const initialPositions = new Float32Array(totalParticles * 3);

    const spacingX = areaWidth / gridSize;
    const spacingZ = areaHeight / gridSize;

    const centerLat = 1.3521;
    const centerLng = 103.8198;
    const scale = 111000;

    // IDW interpolation for wind at position
    const getWindAt = (x: number, z: number): { speed: number; direction: number } => {
      let weightedSpeed = 0;
      let weightedDir = 0;
      let totalWeight = 0;

      speedReadings.forEach(speedReading => {
        const station = stations.find(s => s.station_id === speedReading.station_id);
        const dirReading = directionReadings.find(d => d.station_id === speedReading.station_id);
        if (!station || !dirReading) return;

        const stationX = (station.location.longitude - centerLng) * scale;
        const stationZ = (station.location.latitude - centerLat) * scale;

        const dx = x - stationX;
        const dz = z - stationZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        const weight = distance < 100 ? 1000 : 1 / (distance * distance);
        weightedSpeed += speedReading.speed * weight;
        weightedDir += dirReading.direction * weight;
        totalWeight += weight;
      });

      return {
        speed: totalWeight > 0 ? weightedSpeed / totalWeight : 5,
        direction: totalWeight > 0 ? weightedDir / totalWeight : 0
      };
    };

    let i = 0;
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const baseX = minX + (gx / gridSize) * areaWidth;
        const baseZ = minZ + (gz / gridSize) * areaHeight;

        const wind = getWindAt(baseX, baseZ);
        const speedKnots = wind.speed;
        const directionDeg = wind.direction;

        // Convert wind direction to velocity components
        // Direction is "where wind is coming from" in degrees (0=North)
        // Convert to radians and flip to "where wind is going to"
        const directionRad = ((directionDeg + 180) % 360) * Math.PI / 180;
        const windVx = Math.sin(directionRad) * speedKnots * 0.2;
        const windVz = -Math.cos(directionRad) * speedKnots * 0.2;

        for (let layer = 0; layer < layers; layer++) {
          const x = baseX + (Math.random() - 0.5) * spacingX;
          const y = 5 + layer * 15 + Math.random() * 10;
          const z = baseZ + (Math.random() - 0.5) * spacingZ;

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          initialPositions[i * 3] = x;
          initialPositions[i * 3 + 1] = y;
          initialPositions[i * 3 + 2] = z;

          // Color based on wind speed (cyan spectrum)
          let r, g, b;
          if (speedKnots < 5) {
            r = 0.13; g = 0.83; b = 0.88; // Cyan-400
          } else if (speedKnots < 10) {
            r = 0.02; g = 0.71; b = 0.83; // Cyan-500
          } else if (speedKnots < 15) {
            r = 0.03; g = 0.54; b = 0.70; // Cyan-600
          } else {
            r = 0.05; g = 0.46; b = 0.56; // Cyan-700
          }

          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;

          // Velocity based on wind direction and speed
          velocities[i * 3] = windVx;
          velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2; // Slight vertical drift
          velocities[i * 3 + 2] = windVz;

          i++;
        }
      }
    }

    console.log(`Created ${i} wind particles in ${gridSize}x${gridSize}x${layers} grid within building bounds`);

    return { positions, colors, velocities, initialPositions };
  }, [data, buildingBounds]);

  // Animate particles following wind flow
  useFrame((state, delta) => {
    if (!particlesRef.current || !buildingBounds) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const { minX, maxX, minZ, maxZ } = buildingBounds;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 10;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 10;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 10;

      // Reset when particle leaves bounds
      if (
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
        size={8}
        vertexColors={true}
        transparent={true}
        opacity={0.75}
        sizeAttenuation={true}
        blending={THREE.NormalBlending}
        depthWrite={false}
        map={particleTexture}
      />
    </points>
  );
}
