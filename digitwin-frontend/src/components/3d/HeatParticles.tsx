// Temperature particle effect distributed across buildings
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAreaTemperature } from '../../hooks/useAreaTemperature';
import { useMapBounds } from '../../hooks/useMapBounds';

interface Props {
  planningAreaId: string;
}

export function HeatParticles({ planningAreaId }: Props) {
  const particlesRef = useRef<THREE.Points>(null);
  const areaTemperature = useAreaTemperature(planningAreaId);
  const mapBounds = useMapBounds(planningAreaId);

  // Create solid circular particle texture (no transparency in center)
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Solid center with soft edges
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create particle cloud aligned with map texture
  const { positions, colors, velocities, initialPositions } = useMemo(() => {
    if (!mapBounds.isLoaded || !areaTemperature) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        velocities: new Float32Array(0),
        initialPositions: new Float32Array(0)
      };
    }

    const temp = areaTemperature;
    const { width, height, textureWidth, textureHeight, isNonTransparent } = mapBounds;

    // Reduced particle density to 1/50 of original
    const particleDensity = 0.0003; // particles per square meter (reduced from 0.015)
    const estimatedParticles = Math.floor(width * height * particleDensity);
    const layers = 10; // Vertical layers

    // Temporary arrays to collect valid particles
    const tempPositions: number[] = [];
    const tempColors: number[] = [];
    const tempVelocities: number[] = [];
    const tempInitialPositions: number[] = [];

    let attempts = 0;
    const maxAttempts = estimatedParticles * 5; // Try up to 5x to find valid positions

    while (tempPositions.length / 3 < estimatedParticles && attempts < maxAttempts) {
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

      // Valid position found! Create one particle (will be duplicated in layers below)
      // Store position for layer duplication
      const baseParticleX = x;
      const baseParticleZ = z;

      // Create particles at different heights
      for (let layer = 0; layer < layers; layer++) {
        const particleY = layer * 10 + Math.random() * 8; // Stack particles vertically (0-80m)

        tempPositions.push(baseParticleX, particleY, baseParticleZ);
        tempInitialPositions.push(baseParticleX, particleY, baseParticleZ);

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

        tempColors.push(r, g, b);

        // Velocity based on temperature (hotter = rises faster)
        const baseVelocity = (temp - 27) * 0.5; // Around 27°C as baseline
        tempVelocities.push(
          (Math.random() - 0.5) * 1.2,
          baseVelocity + Math.random() * 0.6,
          (Math.random() - 0.5) * 1.2
        );
      }

      // Break if we have enough particles (one base position = layers particles)
      if (tempPositions.length / 3 >= estimatedParticles) break;
    }

    // Convert to Float32Arrays
    const positions = new Float32Array(tempPositions);
    const colors = new Float32Array(tempColors);
    const velocities = new Float32Array(tempVelocities);
    const initialPositions = new Float32Array(tempInitialPositions);

    console.log(`Created ${positions.length / 3} temperature particles with temp=${temp.toFixed(1)}°C (${attempts} attempts)`);

    return { positions, colors, velocities, initialPositions };
  }, [mapBounds, areaTemperature]);

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
