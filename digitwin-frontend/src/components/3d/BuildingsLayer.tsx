// 3D buildings layer - loads real building data for selected planning area
import { useEffect, useState, useRef } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GroundMapLayer } from './GroundMapLayer';
import { TemperatureHeatmap } from './TemperatureHeatmap';
import { HeatParticles } from './HeatParticles';
import { WindStreamlines } from './WindStreamlines';
import { AirQualityParticles } from './AirQualityParticles';
import { RainfallParticles } from './RainfallParticles';
import { PLANNING_AREA_BOUNDS } from '../../data/planningAreaBounds';

// Building representation from JSON data
interface Building {
  footprint: [number, number][];
  height: number;
}

interface NaturalFeature {
  type: string;
  name?: string;
  coordinates: [number, number][];
}

interface BuildingData {
  planningArea: string;
  id: string;
  buildingCount: number;
  buildings: Building[];
  naturalFeatures?: {
    waterBodies: NaturalFeature[];
    greenSpaces: NaturalFeature[];
    waterCount: number;
    greenCount: number;
  };
}

export function BuildingsLayer() {
  const { selectedPlanningArea, activeLayer } = useEnvironmentStore();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const { camera, controls } = useThree();
  const cameraAnimating = useRef(false);
  const animationStart = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const targetTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    setLoading(true);

    // Load building data from JSON file
    const loadBuildings = async () => {
      try {
        const response = await fetch(`/buildings/${selectedPlanningArea}.json`);
        if (!response.ok) {
          console.warn(`No building data found for ${selectedPlanningArea}`);
          setBuildings([]);
          setLoading(false);
          return;
        }

        const data: BuildingData = await response.json();
        setBuildings(data.buildings);
        console.log(`Loaded ${data.buildingCount} buildings for ${data.planningArea}`);
      } catch (error) {
        console.error(`Failed to load buildings for ${selectedPlanningArea}:`, error);
        setBuildings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBuildings();
  }, [selectedPlanningArea]);

  // Auto-position camera when buildings load
  useEffect(() => {
    if (buildings.length === 0 || !controls) return;

    // Calculate bounding box
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

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeZ);

    // Calculate camera distance
    const distance = maxSize * 1.5;
    const cameraHeight = Math.max(distance * 0.7, maxHeight * 2.5);

    // Set animation targets
    startPos.current.copy(camera.position);
    targetPos.current.set(
      centerX + distance * 0.6,
      cameraHeight,
      centerZ + distance * 0.6
    );

    startTarget.current.copy((controls as any).target || new THREE.Vector3(0, 0, 0));
    targetTarget.current.set(centerX, maxHeight * 0.3, centerZ);

    // Start animation
    cameraAnimating.current = true;
    animationStart.current = Date.now();

    console.log(`Camera targeting: center=(${centerX.toFixed(0)}, ${centerZ.toFixed(0)}), distance=${distance.toFixed(0)}`);
  }, [buildings, camera, controls]);

  // Animate camera
  useFrame(() => {
    if (!cameraAnimating.current) return;

    const elapsed = Date.now() - animationStart.current;
    const duration = 1000; // 1 second
    let progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    progress = 1 - Math.pow(1 - progress, 3);

    // Interpolate position
    camera.position.lerpVectors(startPos.current, targetPos.current, progress);

    // Interpolate target
    if ((controls as any).target) {
      (controls as any).target.lerpVectors(startTarget.current, targetTarget.current, progress);
      (controls as any).update?.();
    }

    if (progress >= 1) {
      cameraAnimating.current = false;
    }
  });

  if (loading) {
    return null;
  }

  return (
    <group>
      {/* Ground map texture for this planning area */}
      <GroundMapLayer planningAreaId={selectedPlanningArea} />

      {/* Temperature visualization layers */}
      {activeLayer === 'temperature' && (
        <HeatParticles key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Wind visualization layers */}
      {activeLayer === 'wind' && (
        <WindStreamlines key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Air quality visualization layers */}
      {activeLayer === 'airQuality' && (
        <AirQualityParticles key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Rainfall visualization layers */}
      {activeLayer === 'rainfall' && (
        <RainfallParticles key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Buildings */}
      {buildings.map((building, index) => {
        const footprint = building.footprint;

        // Create shape for extrusion
        const shape = new THREE.Shape();
        shape.moveTo(footprint[0][0], footprint[0][1]);
        for (let i = 1; i < footprint.length; i++) {
          shape.lineTo(footprint[i][0], footprint[i][1]);
        }
        shape.closePath();

        // Enforce minimum height to avoid Z-fighting with ground
        const height = Math.max(building.height, 3);

        // Varied building colors based on height (taller = darker/glass-like)
        const heightRatio = Math.min(height / 150, 1);
        const isGlassTower = height > 100;
        const isModernTower = height > 60;

        // Color variations for realism
        const seed = index * 0.1;
        const colorVariation = Math.sin(seed) * 0.1;

        let baseColor: string;
        let roughness: number;
        let metalness: number;
        let emissive: string | undefined;
        let emissiveIntensity: number | undefined;

        if (isGlassTower) {
          // Glass towers - blue/cyan tinted
          const blueTint = 0.7 + colorVariation * 0.3;
          baseColor = `rgb(${Math.floor(180 * blueTint)}, ${Math.floor(200 * blueTint)}, ${Math.floor(220)})`;
          roughness = 0.1;
          metalness = 0.7;
          emissive = '#4a90e2';
          emissiveIntensity = 0.1;
        } else if (isModernTower) {
          // Modern buildings - white/beige
          const warmth = 0.9 + colorVariation * 0.1;
          baseColor = `rgb(${Math.floor(240 * warmth)}, ${Math.floor(235 * warmth)}, ${Math.floor(220 * warmth)})`;
          roughness = 0.5;
          metalness = 0.3;
        } else {
          // Residential/older buildings - warmer colors
          const warmVariation = 0.85 + colorVariation * 0.15;
          baseColor = `rgb(${Math.floor(220 * warmVariation)}, ${Math.floor(200 * warmVariation)}, ${Math.floor(180 * warmVariation)})`;
          roughness = 0.8;
          metalness = 0.1;
        }

        return (
          <mesh
            key={`building-${index}`}
            position={[0, 0.5, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <extrudeGeometry
              args={[
                shape,
                {
                  depth: height,
                  bevelEnabled: true,
                  bevelThickness: 0.5,
                  bevelSize: 0.3,
                  bevelSegments: 1,
                },
              ]}
            />
            <meshStandardMaterial
              color={baseColor}
              roughness={roughness}
              metalness={metalness}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              envMapIntensity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}
