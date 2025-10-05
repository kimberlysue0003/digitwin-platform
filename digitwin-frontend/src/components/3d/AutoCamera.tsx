// Auto camera positioning based on building bounds
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useEnvironmentStore } from '../../stores/environmentStore';
import * as THREE from 'three';

interface AutoCameraProps {
  buildings: Array<{ footprint: [number, number][]; height: number }>;
}

export function AutoCamera({ buildings }: AutoCameraProps) {
  const { camera, controls } = useThree();
  const { selectedPlanningArea } = useEnvironmentStore();
  const hasPositioned = useRef(false);

  useEffect(() => {
    if (buildings.length === 0 || !controls) return;

    // Calculate bounding box of all buildings
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxHeight = 0;

    buildings.forEach(building => {
      building.footprint.forEach(([x, z]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      });
      maxHeight = Math.max(maxHeight, building.height);
    });

    // Calculate center and size
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeZ);

    // Set camera target to center of buildings
    const target = new THREE.Vector3(centerX, 0, centerZ);

    // Calculate camera distance based on building area size
    // We want to see the whole area comfortably
    const fov = camera.fov * (Math.PI / 180); // Convert to radians
    const distance = (maxSize / 2) / Math.tan(fov / 2) * 1.5; // 1.5x for padding

    // Position camera at 45-degree angle
    const cameraHeight = Math.max(distance * 0.6, maxHeight * 2);
    const cameraDistance = Math.max(distance, maxSize * 1.2);

    const cameraPosition = new THREE.Vector3(
      centerX + cameraDistance * 0.7,
      cameraHeight,
      centerZ + cameraDistance * 0.7
    );

    // Smoothly animate camera to new position
    const startPosition = camera.position.clone();
    const startTarget = (controls as any).target?.clone() || new THREE.Vector3(0, 0, 0);

    let progress = 0;
    const duration = 1000; // 1 second animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate camera position
      camera.position.lerpVectors(startPosition, cameraPosition, eased);

      // Interpolate camera target
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, target, eased);
      if ((controls as any).target) {
        (controls as any).target.copy(currentTarget);
      }

      (controls as any).update?.();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
    hasPositioned.current = true;

    console.log(`Camera positioned for ${selectedPlanningArea}: center=(${centerX.toFixed(0)}, ${centerZ.toFixed(0)}), distance=${cameraDistance.toFixed(0)}`);
  }, [buildings, camera, controls, selectedPlanningArea]);

  return null;
}
