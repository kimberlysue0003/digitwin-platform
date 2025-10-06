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
  const particlesRef = useRef<THREE.LineSegments>(null);
  const { data } = useEnvironmentStore();
  const [buildingBounds, setBuildingBounds] = useState<{ minX: number; maxX: number; minZ: number; maxZ: number } | null>(null);
  const [mapMetadata, setMapMetadata] = useState<any>(null);
  const [mapTexture, setMapTexture] = useState<HTMLImageElement | null>(null);

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

  // Load map metadata and texture for area-specific center coordinates and alpha channel
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load metadata
        const metaResponse = await fetch(`/map-textures/${planningAreaId}.json`);
        if (!metaResponse.ok) {
          console.warn(`No map metadata for ${planningAreaId}`);
          return;
        }
        const metadata = await metaResponse.json();
        setMapMetadata(metadata);

        // Load texture
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setMapTexture(img);
        img.onerror = () => console.error('Failed to load map texture');
        img.src = `/map-textures/${planningAreaId}.png`;
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, [planningAreaId]);

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
    if (!data?.rainfall?.readings || !data?.rainfall?.stations || !buildingBounds || !mapMetadata || !mapTexture) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { stations, readings } = data.rainfall;

    // Extract alpha channel from map texture
    const canvas = document.createElement('canvas');
    canvas.width = mapTexture.width;
    canvas.height = mapTexture.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return {
      positions: new Float32Array(0),
      colors: new Float32Array(0),
      velocities: new Float32Array(0),
      initialPositions: new Float32Array(0)
    };

    ctx.drawImage(mapTexture, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alphaData = imageData.data; // RGBA format

    // Helper function to check if a pixel is non-transparent
    const isNonTransparent = (x: number, y: number): boolean => {
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
      const idx = (y * canvas.width + x) * 4;
      return alphaData[idx + 3] > 128; // Alpha > 128 = non-transparent
    };

    // Use map metadata bounds (same as GroundMapLayer)
    const [[minLat, minLng], [maxLat, maxLng]] = mapMetadata.bounds;
    const scale = 111000;
    const width = (maxLng - minLng) * scale;
    const height = (maxLat - minLat) * scale;

    // Use area-specific center coordinates from mapMetadata
    const [centerLat, centerLng] = mapMetadata.center;

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
      const x = (Math.random() - 0.5) * width;
      const z = (Math.random() - 0.5) * height;
      totalRainfall += getRainfallAt(x, z);
    }
    const avgRainfall = totalRainfall / samplePoints;

    console.log(`Rainfall for ${planningAreaId}: ${avgRainfall.toFixed(2)} mm`);

    // If no rainfall, don't create any particles
    if (avgRainfall < 0.05) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

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
    const estimatedParticles = Math.floor(baseParticles * particleMultiplier);

    // Temporary arrays to collect valid particles
    const tempPositions: number[] = [];
    const tempColors: number[] = [];
    const tempVelocities: number[] = [];
    const tempInitialPositions: number[] = [];

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

    // Raindrop line length (longer for heavier rain)
    const dropLength = 3 + avgRainfall * 0.5; // 3-15 units long

    let attempts = 0;
    const maxAttempts = estimatedParticles * 5; // Try up to 5x to find valid positions

    while (tempPositions.length / 6 < estimatedParticles && attempts < maxAttempts) {
      attempts++;

      // Random position within map bounds (centered at origin like GroundMapLayer)
      const x = (Math.random() - 0.5) * width;  // -width/2 to +width/2
      const z = (Math.random() - 0.5) * height; // -height/2 to +height/2

      // Convert 3D position to texture UV coordinates
      const u = (x + width / 2) / width;   // 0 to 1
      const v = (z + height / 2) / height; // 0 to 1
      const texX = Math.floor(u * canvas.width);
      const texY = Math.floor(v * canvas.height);

      // Check if this position is on non-transparent area
      if (!isNonTransparent(texX, texY)) continue;

      // Valid position found! Create raindrop line segment
      const y = 150 + Math.random() * 100; // Start from sky

      // Top point
      tempPositions.push(x, y, z);
      // Bottom point
      tempPositions.push(x, y - dropLength, z);

      // Store initial position
      tempInitialPositions.push(x, 150 + Math.random() * 100, z);

      // Color for both vertices (same color)
      tempColors.push(r, g, b); // Top
      tempColors.push(r, g, b); // Bottom

      // Vertical fall with slight horizontal drift (wind effect)
      tempVelocities.push(
        (Math.random() - 0.5) * 2, // Slight horizontal drift
        -fallSpeed,                 // Downward
        (Math.random() - 0.5) * 2
      );
    }

    // Convert to Float32Arrays
    const positions = new Float32Array(tempPositions);
    const colors = new Float32Array(tempColors);
    const velocities = new Float32Array(tempVelocities);
    const initialPositions = new Float32Array(tempInitialPositions);

    console.log(`Created ${positions.length / 6} rain particles (${avgRainfall.toFixed(1)}mm, speed: ${fallSpeed}, ${attempts} attempts)`);
    console.log(`Raindrop color: RGB(${(r * 255).toFixed(0)}, ${(g * 255).toFixed(0)}, ${(b * 255).toFixed(0)})`);

    return { positions, colors, velocities, initialPositions };
  }, [data, buildingBounds, mapMetadata, mapTexture, planningAreaId]);

  // Animate rain falling
  useFrame((state, delta) => {
    if (!particlesRef.current || !buildingBounds) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const { minX, maxX, minZ, maxZ } = buildingBounds;

    // Each raindrop has 2 vertices (line segment)
    const numDrops = velocities.length / 3;

    for (let i = 0; i < numDrops; i++) {
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];

      // Update both vertices of the line segment
      // Top vertex
      positions[i * 6] += vx * delta;
      positions[i * 6 + 1] += vy * delta;
      positions[i * 6 + 2] += vz * delta;

      // Bottom vertex
      positions[i * 6 + 3] += vx * delta;
      positions[i * 6 + 4] += vy * delta;
      positions[i * 6 + 5] += vz * delta;

      // Check if top vertex hits ground or goes out of bounds
      if (
        positions[i * 6 + 1] < 0 ||
        positions[i * 6] < minX || positions[i * 6] > maxX ||
        positions[i * 6 + 2] < minZ || positions[i * 6 + 2] > maxZ
      ) {
        // Respawn at top with new random position
        const newX = minX + Math.random() * (maxX - minX);
        const newY = initialPositions[i * 3 + 1];
        const newZ = minZ + Math.random() * (maxZ - minZ);

        // Top vertex
        positions[i * 6] = newX;
        positions[i * 6 + 1] = newY;
        positions[i * 6 + 2] = newZ;

        // Bottom vertex (offset by drop length)
        const dropLength = 3 + (data?.rainfall?.readings?.[0]?.value || 0) * 0.5;
        positions[i * 6 + 3] = newX;
        positions[i * 6 + 4] = newY - dropLength;
        positions[i * 6 + 5] = newZ;
      }
    }

    positionsAttr.needsUpdate = true;
  });

  if (positions.length === 0) return null;

  return (
    <lineSegments ref={particlesRef}>
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
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        toneMapped={false}
      />
    </lineSegments>
  );
}
