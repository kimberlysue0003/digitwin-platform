// Temperature particle effect distributed across buildings
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

export function HeatParticles({ planningAreaId }: Props) {
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
        console.log(`Building bounds: X[${minX.toFixed(0)}, ${maxX.toFixed(0)}], Z[${minZ.toFixed(0)}, ${maxZ.toFixed(0)}]`);
      } catch (error) {
        console.error('Failed to load building bounds:', error);
      }
    };

    loadBuildingBounds();
  }, [planningAreaId]);

  // Create particle cloud within building bounds
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!data?.temperature || !buildingBounds) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { stations, readings } = data.temperature;

    // Find actual temperature range from data
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    readings.forEach(r => {
      minTemp = Math.min(minTemp, r.value);
      maxTemp = Math.max(maxTemp, r.value);
    });

    console.log(`Temperature range: ${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C`);

    // Use building bounds to distribute particles
    const { minX, maxX, minZ, maxZ } = buildingBounds;
    const areaWidth = maxX - minX;
    const areaHeight = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Create grid based on actual area size (reduced density)
    const gridSize = 20; // Reduced from 30
    const layers = 10;   // Reduced from 15
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

    // IDW interpolation function
    const getTemperatureAt = (x: number, z: number): number => {
      let weightedTemp = 0;
      let totalWeight = 0;

      readings.forEach(reading => {
        const station = stations.find(s => s.station_id === reading.station_id);
        if (!station) return;

        const stationX = (station.location.longitude - centerLng) * scale;
        const stationZ = (station.location.latitude - centerLat) * scale;

        const dx = x - stationX;
        const dz = z - stationZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        const weight = distance < 100 ? 1000 : 1 / (distance * distance);
        weightedTemp += reading.value * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? weightedTemp / totalWeight : 28;
    };

    // Calculate interpolated temperature at area center
    const centerTemp = getTemperatureAt(centerX, centerZ);
    console.log(`\n=== Temperature Analysis for ${planningAreaId} ===`);
    console.log(`Area center: [${centerX.toFixed(0)}, ${centerZ.toFixed(0)}]`);
    console.log(`Center temperature (interpolated): ${centerTemp.toFixed(2)}°C`);
    console.log(`Data range: ${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C`);
    console.log(`Temperature variance: ${(maxTemp - minTemp).toFixed(1)}°C`);
    console.log(`\nNearby stations (${readings.length} total):`);
    readings.forEach(reading => {
      const station = stations.find(s => s.station_id === reading.station_id);
      if (station) {
        const stationX = (station.location.longitude - centerLng) * scale;
        const stationZ = (station.location.latitude - centerLat) * scale;
        const distance = Math.sqrt((centerX - stationX) ** 2 + (centerZ - stationZ) ** 2);
        console.log(`  - ${station.name || station.station_id}: ${reading.value}°C (${(distance / 1000).toFixed(1)}km away)`);
      }
    });
    console.log(`============================================\n`);

    let i = 0;
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        // Position particles within building bounds
        const baseX = minX + (gx / gridSize) * areaWidth;
        const baseZ = minZ + (gz / gridSize) * areaHeight;

        // Get interpolated temperature at this grid point
        const temp = getTemperatureAt(baseX, baseZ);

        // Use actual temperature range from data
        const tempRange = maxTemp - minTemp;
        const normalizedTemp = tempRange > 0 ? (temp - minTemp) / tempRange : 0.5;

        // Create multiple particles at different heights
        for (let layer = 0; layer < layers; layer++) {
          const x = baseX + (Math.random() - 0.5) * spacingX;
          const y = layer * 10 + Math.random() * 8; // Stack particles vertically (0-150m)
          const z = baseZ + (Math.random() - 0.5) * spacingZ;

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          initialPositions[i * 3] = x;
          initialPositions[i * 3 + 1] = y;
          initialPositions[i * 3 + 2] = z;

          // Color mapping matching 2D temperature layer (DataOverlays.tsx)
          // Same ranges: <26 Blue, 26-28 Green, 28-30 Yellow, >=30 Red
          let r, g, b;
          if (temp < 26) {
            // Blue (#3b82f6)
            r = 0x3b / 255;
            g = 0x82 / 255;
            b = 0xf6 / 255;
          } else if (temp < 28) {
            // Green (#10b981)
            r = 0x10 / 255;
            g = 0xb9 / 255;
            b = 0x81 / 255;
          } else if (temp < 30) {
            // Yellow (#fbbf24)
            r = 0xfb / 255;
            g = 0xbf / 255;
            b = 0x24 / 255;
          } else {
            // Red (#ef4444)
            r = 0xef / 255;
            g = 0x44 / 255;
            b = 0x44 / 255;
          }

          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;

          // Velocity based on temperature (normalized around middle of range)
          const tempMiddle = (minTemp + maxTemp) / 2;
          const tempDeviation = (temp - tempMiddle) / (tempRange / 2);
          const baseVelocity = tempDeviation * 2.0; // -2 to +2

          velocities[i * 3] = (Math.random() - 0.5) * 1.2;
          velocities[i * 3 + 1] = baseVelocity + Math.random() * 0.6;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;

          i++;
        }
      }
    }

    console.log(`Created ${i} temperature particles in ${gridSize}x${gridSize}x${layers} grid within building bounds`);

    return { positions, colors, velocities, initialPositions };
  }, [data, buildingBounds]);

  // Animate particles
  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 10;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 10;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 10;

      // Reset when out of bounds (hot particles go up, cold particles go down)
      if (positions[i * 3 + 1] > 100) {
        positions[i * 3] = initialPositions[i * 3];
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = initialPositions[i * 3 + 2];
      } else if (positions[i * 3 + 1] < -20) {
        positions[i * 3] = initialPositions[i * 3];
        positions[i * 3 + 1] = 40;
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
