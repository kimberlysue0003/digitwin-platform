// 3D buildings layer - loads only selected region (simplified for performance)
import { useEffect, useState } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import * as THREE from 'three';

// Simplified building representation
interface SimpleBuilding {
  coords: [number, number][];
  height: number;
}

// Generate procedural buildings for each region
function generateRegionBuildings(region: string): SimpleBuilding[] {
  const buildings: SimpleBuilding[] = [];
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const buildingCount = 50; // Limited buildings per region for performance

  // Region bounds (in local coordinates)
  const regionBounds: Record<string, { minX: number; maxX: number; minZ: number; maxZ: number }> = {
    central: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
    north: { minX: -500, maxX: 500, minZ: -2500, maxZ: -1000 },
    south: { minX: -500, maxX: 500, minZ: 1000, maxZ: 2500 },
    east: { minX: 1000, maxX: 2500, minZ: -500, maxZ: 500 },
    west: { minX: -2500, maxX: -1000, minZ: -500, maxZ: 500 },
  };

  const bounds = regionBounds[region] || regionBounds.central;

  for (let i = 0; i < buildingCount; i++) {
    const seed = i * 1000 + region.charCodeAt(0);
    const x = bounds.minX + random(seed) * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + random(seed + 1) * (bounds.maxZ - bounds.minZ);
    const width = 30 + random(seed + 2) * 70;
    const depth = 30 + random(seed + 3) * 70;
    const height = 15 + random(seed + 4) * 100;

    buildings.push({
      coords: [
        [x, z],
        [x + width, z],
        [x + width, z + depth],
        [x, z + depth],
        [x, z],
      ],
      height,
    });
  }

  return buildings;
}

export function BuildingsLayer() {
  const { selectedRegion } = useEnvironmentStore();
  const [buildings, setBuildings] = useState<SimpleBuilding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Simulate loading delay
    setTimeout(() => {
      const regionBuildings = generateRegionBuildings(selectedRegion);
      setBuildings(regionBuildings);
      setLoading(false);
      console.log(`Generated ${regionBuildings.length} buildings for ${selectedRegion} region`);
    }, 300);
  }, [selectedRegion]);

  if (loading) {
    return (
      <mesh position={[0, 200, 0]}>
        <boxGeometry args={[100, 100, 100]} />
        <meshStandardMaterial color="#667eea" emissive="#667eea" emissiveIntensity={0.5} />
      </mesh>
    );
  }

  return (
    <group>
      {buildings.map((building, index) => {
        const coords = building.coords;

        // Create shape for extrusion
        const shape = new THREE.Shape();
        shape.moveTo(coords[0][0], coords[0][1]);
        for (let i = 1; i < coords.length; i++) {
          shape.lineTo(coords[i][0], coords[i][1]);
        }
        shape.closePath();

        const height = building.height;

        return (
          <mesh
            key={`building-${index}`}
            position={[0, height / 2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <extrudeGeometry
              args={[
                shape,
                {
                  depth: height,
                  bevelEnabled: false,
                },
              ]}
            />
            <meshStandardMaterial
              color="#cccccc"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}
