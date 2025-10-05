// 2D Natural features overlay - water and green spaces with animated effects
import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NaturalFeature {
  type: string;
  name?: string;
  coordinates: [number, number][];
}

interface NaturalFeaturesData {
  waterBodies: NaturalFeature[];
  greenSpaces: NaturalFeature[];
  waterCount: number;
  greenCount: number;
}

interface Props {
  planningAreaId: string;
}

export function NaturalFeatures2DLayer({ planningAreaId }: Props) {
  const [waterBodies, setWaterBodies] = useState<NaturalFeature[]>([]);
  const [greenSpaces, setGreenSpaces] = useState<NaturalFeature[]>([]);
  const waterMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/buildings/${planningAreaId}.json`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.naturalFeatures) {
          setWaterBodies(data.naturalFeatures.waterBodies || []);
          setGreenSpaces(data.naturalFeatures.greenSpaces || []);
        }
      } catch (error) {
        console.error('Failed to load natural features:', error);
      }
    };

    loadData();
  }, [planningAreaId]);

  // Animate water opacity for flowing effect
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    waterMaterialsRef.current.forEach((material, index) => {
      if (material) {
        // Gentle pulsing effect
        const offset = index * 0.3;
        material.opacity = 0.5 + Math.sin(time * 0.5 + offset) * 0.15;
      }
    });
  });

  return (
    <group>
      {/* Green spaces - flat 2D overlay (render first, lower) */}
      {greenSpaces.map((green, index) => {
        if (green.coordinates.length < 3) return null;

        const shape = new THREE.Shape();
        shape.moveTo(green.coordinates[0][0], green.coordinates[0][1]);
        for (let i = 1; i < green.coordinates.length; i++) {
          shape.lineTo(green.coordinates[i][0], green.coordinates[i][1]);
        }
        shape.closePath();

        let greenColor = '#5cb36f';
        let opacity = 0.4;

        if (green.type === 'forest' || green.type === 'wood') {
          greenColor = '#2d6b3d';
          opacity = 0.5;
        } else if (green.type === 'nature_reserve' || green.type === 'national_park') {
          greenColor = '#1f5c2e';
          opacity = 0.45;
        }

        return (
          <mesh
            key={`green-${index}`}
            position={[0, 0.8, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial
              color={greenColor}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Water bodies - flat 2D with flowing animation (render second, higher) */}
      {waterBodies.map((water, index) => {
        if (water.coordinates.length < 3) return null;

        const shape = new THREE.Shape();
        shape.moveTo(water.coordinates[0][0], water.coordinates[0][1]);
        for (let i = 1; i < water.coordinates.length; i++) {
          shape.lineTo(water.coordinates[i][0], water.coordinates[i][1]);
        }
        shape.closePath();

        const isLarge = water.type === 'reservoir' || water.type === 'lake';
        const waterColor = isLarge ? '#3d7bc4' : '#5ba3f0';

        return (
          <mesh
            key={`water-${index}`}
            position={[0, 1.2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
          >
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial
              ref={(ref) => {
                if (ref) waterMaterialsRef.current[index] = ref;
              }}
              color={waterColor}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
