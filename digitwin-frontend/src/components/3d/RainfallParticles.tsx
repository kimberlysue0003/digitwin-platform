// Rainfall particle effect - realistic rain simulation based on intensity
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useAreaRainfall } from '../../hooks/useAreaRainfall';

interface Props {
  planningAreaId: string;
}

export function RainfallParticles({ planningAreaId }: Props) {
  const particlesRef = useRef<THREE.LineSegments>(null);
  const mapBounds = useMapBounds(planningAreaId);

  // Use the same rainfall calculation as DataCards (sidebar)
  const avgRainfall = useAreaRainfall(planningAreaId);

  // Create rain particle system
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!mapBounds.isLoaded) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const { width, height, textureWidth, textureHeight, isNonTransparent } = mapBounds;

    // If no rainfall, don't create any particles
    // Use very low threshold (0.01mm) to show even trace amounts
    if (avgRainfall < 0.01) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    // Adjust particle count based on rainfall intensity
    // Singapore rainfall scale (mm/hour):
    // 0.1-1mm: Very light drizzle
    // 1-5mm: Light rain
    // 5-10mm: Moderate rain
    // 10-20mm: Heavy rain
    // 20+mm: Very heavy/torrential rain
    let particleMultiplier = 1;
    if (avgRainfall < 0.5) {
      particleMultiplier = 0.3; // Very light drizzle (100-600 particles)
    } else if (avgRainfall < 1) {
      particleMultiplier = 0.5; // Light drizzle (1000 particles)
    } else if (avgRainfall < 3) {
      particleMultiplier = 1; // Light rain (2000 particles)
    } else if (avgRainfall < 8) {
      particleMultiplier = 2; // Moderate rain (4000 particles)
    } else if (avgRainfall < 15) {
      particleMultiplier = 3; // Heavy rain (6000 particles)
    } else {
      particleMultiplier = 4; // Very heavy/torrential (8000 particles)
    }

    const baseParticles = 2000;
    const estimatedParticles = Math.floor(baseParticles * particleMultiplier);

    // Temporary arrays to collect valid particles
    const tempPositions: number[] = [];
    const tempColors: number[] = [];
    const tempVelocities: number[] = [];
    const tempInitialPositions: number[] = [];

    // Color based on rainfall intensity
    // For very light rain (< 0.5mm), use more visible bright cyan/white
    // to make drizzle stand out against the map background
    let r, g, b;
    if (avgRainfall < 0.5) {
      // Very light drizzle - bright cyan/white for high visibility
      r = 0xd0 / 255; g = 0xf5 / 255; b = 0xff / 255;
    } else if (avgRainfall < 2) {
      // Light rain - light blue
      r = 0xba / 255; g = 0xe6 / 255; b = 0xfd / 255;
    } else if (avgRainfall < 5) {
      // Moderate rain - medium blue
      r = 0x7d / 255; g = 0xd3 / 255; b = 0xfc / 255;
    } else if (avgRainfall < 10) {
      // Heavy rain - blue
      r = 0x38 / 255; g = 0xbd / 255; b = 0xf8 / 255;
    } else if (avgRainfall < 20) {
      // Very heavy rain - deep blue
      r = 0x0e / 255; g = 0xa5 / 255; b = 0xe9 / 255;
    } else {
      // Torrential rain - dark blue
      r = 0x03 / 255; g = 0x69 / 255; b = 0xa1 / 255;
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
      const texX = Math.floor(u * textureWidth);
      const texY = Math.floor(v * textureHeight);

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
  }, [avgRainfall, mapBounds]);

  // Animate rain falling
  useFrame((state, delta) => {
    if (!particlesRef.current || !mapBounds.isLoaded) return;

    const positionsAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionsAttr.array as Float32Array;

    const { width, height } = mapBounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

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
        positions[i * 6] < -halfWidth || positions[i * 6] > halfWidth ||
        positions[i * 6 + 2] < -halfHeight || positions[i * 6 + 2] > halfHeight
      ) {
        // Respawn at top with new random position
        const newX = (Math.random() - 0.5) * width;
        const newY = initialPositions[i * 3 + 1];
        const newZ = (Math.random() - 0.5) * height;

        // Top vertex
        positions[i * 6] = newX;
        positions[i * 6 + 1] = newY;
        positions[i * 6 + 2] = newZ;

        // Bottom vertex (offset by drop length)
        const dropLength = 3 + avgRainfall * 0.5;
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
