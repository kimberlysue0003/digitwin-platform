// Natural features layer - water bodies and green spaces from OpenStreetMap
import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface NaturalFeature {
  type: string;
  name?: string;
  coordinates: [number, number][];
}

interface WaterData {
  count: number;
  features: NaturalFeature[];
}

interface GreenSpaceData {
  count: number;
  features: NaturalFeature[];
}

export function NaturalFeaturesLayer() {
  const [waterBodies, setWaterBodies] = useState<NaturalFeature[]>([]);
  const [greenSpaces, setGreenSpaces] = useState<NaturalFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load water bodies
        const waterResponse = await fetch('/natural-features/water.json');
        if (waterResponse.ok) {
          const waterData: WaterData = await waterResponse.json();
          setWaterBodies(waterData.features);
          console.log(`Loaded ${waterData.count} water bodies`);
        }

        // Load green spaces
        const greenResponse = await fetch('/natural-features/green-spaces.json');
        if (greenResponse.ok) {
          const greenData: GreenSpaceData = await greenResponse.json();
          setGreenSpaces(greenData.features);
          console.log(`Loaded ${greenData.count} green spaces`);
        }
      } catch (error) {
        console.error('Failed to load natural features:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return null;

  // Filter to only major water bodies and green spaces for performance
  const significantWater = waterBodies
    .filter(water => {
      if (water.coordinates.length < 3) return false;

      // Calculate area to filter out tiny fragments
      let area = 0;
      for (let i = 0; i < water.coordinates.length - 1; i++) {
        area += water.coordinates[i][0] * water.coordinates[i + 1][1];
        area -= water.coordinates[i + 1][0] * water.coordinates[i][1];
      }
      area = Math.abs(area / 2);

      // Only keep major water bodies (>50,000 sq meters = 0.05 sq km)
      return area > 50000;
    })
    .slice(0, 100); // Limit to top 100 largest

  // Filter green spaces - only major parks and forests
  const significantGreen = greenSpaces
    .filter(green => {
      if (green.coordinates.length < 3) return false;

      let area = 0;
      for (let i = 0; i < green.coordinates.length - 1; i++) {
        area += green.coordinates[i][0] * green.coordinates[i + 1][1];
        area -= green.coordinates[i + 1][0] * green.coordinates[i][1];
      }
      area = Math.abs(area / 2);

      // Only keep major green spaces (>100,000 sq meters = 0.1 sq km)
      return area > 100000;
    })
    .slice(0, 80); // Limit to top 80 largest

  return (
    <group>
      {/* Water bodies - blue/cyan */}
      {significantWater.map((water, index) => {
        const shape = new THREE.Shape();
        shape.moveTo(water.coordinates[0][0], water.coordinates[0][1]);

        // Use smooth curves for more natural appearance
        for (let i = 1; i < water.coordinates.length; i++) {
          const current = water.coordinates[i];
          const prev = water.coordinates[i - 1];

          // Add slight curve between points for smoother edges
          if (i < water.coordinates.length - 1) {
            const next = water.coordinates[i + 1];
            const cp1x = prev[0] * 0.7 + current[0] * 0.3;
            const cp1y = prev[1] * 0.7 + current[1] * 0.3;
            const cp2x = current[0] * 0.7 + next[0] * 0.3;
            const cp2y = current[1] * 0.7 + next[1] * 0.3;
            shape.quadraticCurveTo(cp1x, cp1y, current[0], current[1]);
          } else {
            shape.lineTo(current[0], current[1]);
          }
        }
        shape.closePath();

        // Different colors for different water types
        let waterColor = '#4a90e2';
        let depth = 2;

        if (water.type === 'river' || water.type === 'stream' || water.type === 'canal') {
          waterColor = '#5ba3f0';
          depth = 1.5;
        } else if (water.type === 'reservoir' || water.type === 'lake') {
          waterColor = '#3d7bc4';
          depth = 3;
        }

        return (
          <mesh
            key={`water-${index}`}
            position={[0, 0.8, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <extrudeGeometry
              args={[
                shape,
                {
                  depth: depth,
                  bevelEnabled: true,
                  bevelThickness: 0.2,
                  bevelSize: 0.1,
                  bevelSegments: 2,
                },
              ]}
            />
            <meshStandardMaterial
              color={waterColor}
              roughness={0.15}
              metalness={0.5}
              transparent
              opacity={0.88}
              emissive={waterColor}
              emissiveIntensity={0.12}
            />
          </mesh>
        );
      })}

      {/* Green spaces - various shades of green */}
      {significantGreen.map((green, index) => {
        const shape = new THREE.Shape();
        shape.moveTo(green.coordinates[0][0], green.coordinates[0][1]);

        // Use smooth curves for natural green spaces
        for (let i = 1; i < green.coordinates.length; i++) {
          const current = green.coordinates[i];
          const prev = green.coordinates[i - 1];

          if (i < green.coordinates.length - 1) {
            const next = green.coordinates[i + 1];
            const cp1x = prev[0] * 0.7 + current[0] * 0.3;
            const cp1y = prev[1] * 0.7 + current[1] * 0.3;
            shape.quadraticCurveTo(cp1x, cp1y, current[0], current[1]);
          } else {
            shape.lineTo(current[0], current[1]);
          }
        }
        shape.closePath();

        // Different colors for different green space types
        let greenColor = '#4a9d5f';
        let depth = 2;

        if (green.type === 'forest' || green.type === 'wood') {
          greenColor = '#2d6b3d';
          depth = 6;
        } else if (green.type === 'nature_reserve' || green.type === 'national_park') {
          greenColor = '#1f5c2e';
          depth = 4;
        } else if (green.type === 'park') {
          greenColor = '#5cb36f';
          depth = 2;
        }

        return (
          <mesh
            key={`green-${index}`}
            position={[0, 0.5, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            castShadow
          >
            <extrudeGeometry
              args={[
                shape,
                {
                  depth: depth,
                  bevelEnabled: true,
                  bevelThickness: 0.3,
                  bevelSize: 0.2,
                  bevelSegments: 2,
                },
              ]}
            />
            <meshStandardMaterial
              color={greenColor}
              roughness={0.85}
              metalness={0.0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
