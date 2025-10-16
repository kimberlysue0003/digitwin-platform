// 3D buildings layer - loads real building data for selected planning area
import { useEffect, useState, useRef } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GroundMapLayer } from './GroundMapLayer';
import { TemperatureFog } from './TemperatureFog';
import { WindStreamlines } from './WindStreamlines';
import { AirQualityParticles } from './AirQualityParticles';
import { RainfallParticles } from './RainfallParticles';
import { buildApiUrl } from '../../config/api';

// Building representation from JSON data
interface Building {
  footprint: [number, number][];
  height: number;
}

// Prepared building with pre-created geometry
interface PreparedBuilding {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
  material: {
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
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

interface WorkerBuildingResult {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint32Array | Uint16Array | null;
}

interface WorkerResponse {
  requestId: string;
  buildings: WorkerBuildingResult[];
}

// Helper function to calculate material properties based on building height
function calculateMaterialProps(height: number, index: number) {
  const isGlassTower = height > 100;
  const isModernTower = height > 60;
  const seed = index * 0.1;
  const colorVariation = Math.sin(seed) * 0.1;

  if (isGlassTower) {
    const blueTint = 0.7 + colorVariation * 0.3;
    return {
      color: `rgb(${Math.floor(180 * blueTint)}, ${Math.floor(200 * blueTint)}, 220)`,
      roughness: 0.1,
      metalness: 0.7,
      emissive: '#4a90e2',
      emissiveIntensity: 0.1
    };
  } else if (isModernTower) {
    const warmth = 0.9 + colorVariation * 0.1;
    return {
      color: `rgb(${Math.floor(240 * warmth)}, ${Math.floor(235 * warmth)}, ${Math.floor(220 * warmth)})`,
      roughness: 0.5,
      metalness: 0.3
    };
  } else {
    const warmVariation = 0.85 + colorVariation * 0.15;
    return {
      color: `rgb(${Math.floor(220 * warmVariation)}, ${Math.floor(200 * warmVariation)}, ${Math.floor(180 * warmVariation)})`,
      roughness: 0.8,
      metalness: 0.1
    };
  }
}

export function BuildingsLayer() {
  const { selectedPlanningArea, activeLayer } = useEnvironmentStore();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [readyToDisplay, setReadyToDisplay] = useState(false);
  const [geometryProgress, setGeometryProgress] = useState(0);
  const [preparedBuildings, setPreparedBuildings] = useState<PreparedBuilding[]>([]);
  const [effectsReady, setEffectsReady] = useState(false);
  const { camera, controls } = useThree();
  const cameraAnimating = useRef(false);
  const animationStart = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const targetTarget = useRef(new THREE.Vector3());
  const progressRef = useRef(0); // Track progress with ref to avoid state update issues
  const buildingAnimating = useRef(false);
  const buildingAnimationStart = useRef(0);
  const buildingMeshRefs = useRef<THREE.Mesh[]>([]);
  const animationInitialized = useRef(false);
  const effectsReadyRef = useRef(false);
  const effectsTimeoutRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);
  const pendingRequestsRef = useRef(
    new Map<string, { cacheKey: string; buildings: Building[] }>()
  );
  const geometryCacheRef = useRef<Record<string, PreparedBuilding[]>>({});
  const selectedAreaRef = useRef(selectedPlanningArea);
  const geometryWorkerSupported = typeof Worker !== 'undefined';
  const BUILDING_EFFECT_DELAY = 2600; // slightly longer than growth animation
  // Control whether to fallback to public/buildings when API is empty/unavailable (disabled by default)
  const ENABLE_BUILDINGS_FALLBACK = (import.meta as any).env?.VITE_BUILDINGS_FALLBACK === '1';
  const clearEffectsTimeout = () => {
    if (effectsTimeoutRef.current !== null) {
      clearTimeout(effectsTimeoutRef.current);
      effectsTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    selectedAreaRef.current = selectedPlanningArea;
  }, [selectedPlanningArea]);

  useEffect(() => {
    if (!geometryWorkerSupported || workerRef.current) {
      return;
    }

    const worker = new Worker(
      new URL('../../workers/buildingGeometryWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, buildings: results } = event.data;
      const pending = pendingRequestsRef.current.get(requestId);
      if (!pending) {
        return;
      }

      pendingRequestsRef.current.delete(requestId);
      const { cacheKey, buildings: originalBuildings } = pending;

      const total = results.length || 0;
      const prepared: PreparedBuilding[] = [];
      const batchSize = 200;

      const processBatch = (startIndex: number) => {
        const end = Math.min(startIndex + batchSize, total);
        for (let index = startIndex; index < end; index++) {
          const result = results[index];
          const geometry = new THREE.BufferGeometry();
          if (result.positions.length > 0) {
            geometry.setAttribute(
              'position',
              new THREE.BufferAttribute(result.positions, 3)
            );
          }
          if (result.normals.length > 0) {
            geometry.setAttribute(
              'normal',
              new THREE.BufferAttribute(result.normals, 3)
            );
          } else {
            geometry.computeVertexNormals();
          }
          if (result.uvs && result.uvs.length > 0) {
            geometry.setAttribute('uv', new THREE.BufferAttribute(result.uvs, 2));
          }
          if (result.indices && result.indices.length > 0) {
            geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));
          }
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          const buildingData = originalBuildings[index] ?? { height: 0 };
          const material = calculateMaterialProps(buildingData.height, index);

          prepared.push({
            geometry,
            position: [0, 0.5, 0],
            rotation: [-Math.PI / 2, 0, 0],
            material,
          });
        }

        // Update progress smoothly from 15% -> 100%
        const progress = total > 0 ? 15 + Math.floor(((end) / total) * 85) : 100;
        if (progress > progressRef.current) {
          progressRef.current = progress;
          setGeometryProgress(progress);
        }

        if (end < total) {
          // Yield to the browser to render progress
          setTimeout(() => processBatch(end), 0);
        } else {
          // Completed
          geometryCacheRef.current[cacheKey] = prepared;
          const [areaId] = cacheKey.split(':');
          if (areaId === selectedAreaRef.current) {
            setPreparedBuildings(prepared.map((item) => ({ ...item })));
            setReadyToDisplay(true);
            setGeometryProgress(100);
            clearEffectsTimeout();
            effectsReadyRef.current = true;
            setEffectsReady(true);
          }
        }
      };

      // Start progressive processing on main thread
      processBatch(0);
    };

    worker.onerror = (event) => {
      console.error('Building geometry worker error:', event);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRequestsRef.current.clear();
    };
  }, [geometryWorkerSupported]);

  useEffect(() => {
    setLoading(true);
    setBuildings([]); // Clear previous buildings
    setReadyToDisplay(false);
    setEffectsReady(false);
    effectsReadyRef.current = false;
    clearEffectsTimeout();
    buildingAnimating.current = false;
    animationInitialized.current = false;
    buildingMeshRefs.current = [];
    progressRef.current = 0;
    setGeometryProgress(0);

    // Helper: load buildings from public fallback JSON (for local dev)
    const loadFromPublic = async (areaId: string): Promise<Building[] | null> => {
      try {
        const url = `/buildings/${areaId}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json: BuildingData = await res.json();
        if (!json || !json.buildings) return null;
        const transformed: Building[] = json.buildings.map((b: any) => ({
          footprint: (b.footprint || []).map((p: any) => [p[0] ?? p.x, p[1] ?? p.z] as [number, number]),
          height: b.height ?? 0,
        }));
        return transformed;
      } catch {
        return null;
      }
    };

    // Load building data from backend API
    const loadBuildings = async () => {
      try {
        console.log(`🌐 Loading buildings from API...`);

        // First, get chunk info
        const infoResponse = await fetch(`${buildApiUrl("/api/buildings")}/${selectedPlanningArea}/chunks/info`);
        if (!infoResponse.ok) {
          console.warn(`No building data found for ${selectedPlanningArea} via API`);
          if (ENABLE_BUILDINGS_FALLBACK) {
            const fallback = await loadFromPublic(selectedPlanningArea);
            if (fallback && fallback.length > 0) {
              setBuildings(fallback);
            } else {
              setBuildings([]);
            }
          } else {
            setBuildings([]);
          }
          setLoading(false);
          return;
        }

        const infoData = await infoResponse.json();
        const { total_chunks, total_count } = infoData.data;

        console.log(`Loading ${total_count} buildings in ${total_chunks} chunks for ${selectedPlanningArea}`);

        // Load all chunks in parallel - no progressive updates to avoid flickering
        const startTime = Date.now();

        // Create all fetch promises at once (parallel loading)
        const allChunkPromises = [];
        for (let chunkIndex = 0; chunkIndex < total_chunks; chunkIndex++) {
          allChunkPromises.push(
            fetch(`${buildApiUrl("/api/buildings")}/${selectedPlanningArea}/chunks/${chunkIndex}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => data ? data.data : [])
              .catch(err => {
                console.error(`Failed to load chunk ${chunkIndex}:`, err);
                return [];
              })
          );
        }

        console.log(`Loading ${total_count} buildings in ${total_chunks} parallel requests...`);

        // Wait for ALL chunks to complete
        const allChunkResults = await Promise.all(allChunkPromises);

        // Transform all buildings at once
        const allBuildings: Building[] = [];
        allChunkResults.forEach(chunkBuildings => {
          if (chunkBuildings && chunkBuildings.length > 0) {
            const transformedChunk = chunkBuildings.map((building: any) => ({
              footprint: building.footprint.map((point: any) => [point.x, point.z]),
              height: building.height
            }));
            allBuildings.push(...transformedChunk);
          }
        });

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Loaded ${allBuildings.length} buildings from API in ${totalTime}s`);

        // If API returned empty, try public fallback (local dev)
        if (allBuildings.length === 0) {
          if (ENABLE_BUILDINGS_FALLBACK) {
            const fallback = await loadFromPublic(selectedPlanningArea);
            if (fallback && fallback.length > 0) {
              setBuildings(fallback);
            } else {
              setBuildings([]);
            }
          } else {
            setBuildings([]);
          }
        } else {
          // Update buildings ONLY ONCE - no flickering!
          setBuildings(allBuildings);
        }
      } catch (error) {
        console.error(`Failed to load buildings for ${selectedPlanningArea}:`, error);
        // On error, fallback only if enabled
        if (ENABLE_BUILDINGS_FALLBACK) {
          const fallback = await loadFromPublic(selectedPlanningArea);
          if (fallback && fallback.length > 0) {
            setBuildings(fallback);
          } else {
            setBuildings([]);
          }
        } else {
          setBuildings([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBuildings();
  }, [selectedPlanningArea]);

  useEffect(() => {
    if (!geometryWorkerSupported || !workerRef.current || loading) {
      return;
    }

    if (buildings.length === 0) {
      setPreparedBuildings([]);
      setReadyToDisplay(false);
      setGeometryProgress(0);
      return;
    }

    const cacheKey = `${selectedPlanningArea}:${buildings.length}`;
    const cached = geometryCacheRef.current[cacheKey];
    if (cached) {
      setPreparedBuildings(cached.map((item) => ({ ...item })));
      setReadyToDisplay(true);
      setGeometryProgress(100);
      if (!effectsReadyRef.current) {
        effectsReadyRef.current = true;
        setEffectsReady(true);
      }
      return;
    }

    setReadyToDisplay(false);
    setGeometryProgress(15);
    clearEffectsTimeout();
    effectsReadyRef.current = false;
    setEffectsReady(false);

    const requestId = `${selectedPlanningArea}-${Date.now()}-${workerRequestIdRef.current++}`;
    pendingRequestsRef.current.set(requestId, { cacheKey, buildings: [...buildings] });
    workerRef.current.postMessage({ requestId, buildings });
  }, [geometryWorkerSupported, buildings, selectedPlanningArea, loading]);

  // Prepare geometries asynchronously after buildings data is loaded
  useEffect(() => {
    if (geometryWorkerSupported) {
      return;
    }

    if (buildings.length === 0) {
      setPreparedBuildings([]);
      setReadyToDisplay(true);
      setGeometryProgress(100);
      progressRef.current = 100;
      clearEffectsTimeout();
      if (!effectsReadyRef.current) {
        effectsReadyRef.current = true;
        setEffectsReady(true);
      }
      return;
    }

    setReadyToDisplay(false);
    setGeometryProgress(0);
    progressRef.current = 0;
    setPreparedBuildings([]);
    animationInitialized.current = false;
    setEffectsReady(false);
    effectsReadyRef.current = false;
    clearEffectsTimeout();

    const prepareGeometries = async () => {
      const batchSize = 100; // Process 100 buildings per batch
      const prepared: PreparedBuilding[] = [];
      const startTime = Date.now();
      const totalBuildings = buildings.length;

      console.log(`Preparing ${totalBuildings} building geometries...`);

      for (let i = 0; i < totalBuildings; i += batchSize) {
        const endIndex = Math.min(i + batchSize, totalBuildings);
        const batch = buildings.slice(i, endIndex);

        // Process current batch
        batch.forEach((building, idx) => {
          const globalIndex = i + idx;
          const footprint = building.footprint;

          // Create shape
          const shape = new THREE.Shape();
          shape.moveTo(footprint[0][0], footprint[0][1]);
          for (let j = 1; j < footprint.length; j++) {
            shape.lineTo(footprint[j][0], footprint[j][1]);
          }
          shape.closePath();

          // Create geometry
          const height = Math.max(building.height, 3);
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelSegments: 1,
          });

          // Calculate material properties
          const material = calculateMaterialProps(height, globalIndex);

          prepared.push({
            geometry,
            position: [0, 0.5, 0],
            rotation: [-Math.PI / 2, 0, 0],
            material
          });
        });

        // Update progress - ensure monotonically increasing
        const newProgress = Math.min(100, (endIndex / totalBuildings) * 100);
        if (newProgress > progressRef.current) {
          progressRef.current = newProgress;
          setGeometryProgress(newProgress);
        }

        // Yield to main thread to avoid blocking UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Prepared ${prepared.length} building geometries in ${totalTime}s`);

      // All geometries are ready, display them at once - no flickering!
      setPreparedBuildings(prepared);
      buildingMeshRefs.current = [];
      setReadyToDisplay(true);
    };

    prepareGeometries();
  }, [buildings]);

  // If there are no buildings to animate, allow effects to show once ready
  useEffect(() => {
    if (readyToDisplay && preparedBuildings.length === 0 && !effectsReadyRef.current) {
      effectsReadyRef.current = true;
      clearEffectsTimeout();
      setEffectsReady(true);
    }
  }, [readyToDisplay, preparedBuildings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearEffectsTimeout();
    };
  }, []);

  // Auto-position camera when buildings are ready to display
  useEffect(() => {
    if (!readyToDisplay || preparedBuildings.length === 0 || !controls) return;

    // Calculate bounding box from buildings data
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
  }, [readyToDisplay, preparedBuildings, buildings, camera, controls]);

  // Animate camera and buildings + Frustum Culling
  useFrame(() => {
    // Camera animation
    if (cameraAnimating.current) {
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
    }

    // Building growth animation
    if (buildingAnimating.current && buildingMeshRefs.current.length > 0) {
      const elapsed = Date.now() - buildingAnimationStart.current;
      const duration = 2500; // 2.5 seconds for growth animation
      let progress = Math.min(elapsed / duration, 1);

      // Ease out back - creates a slight overshoot effect
      const c1 = 1.70158;
      const c3 = c1 + 1;
      progress = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
      progress = Math.max(0, Math.min(1, progress)); // Clamp to [0, 1]

      // Apply scale to all building meshes
      // Since buildings are rotated -90° on X axis, Z axis becomes the vertical axis
      buildingMeshRefs.current.forEach((mesh) => {
        if (mesh) {
          mesh.scale.setZ(progress);
        }
      });

      if (progress >= 1) {
        buildingAnimating.current = false;
        if (!effectsReadyRef.current) {
          effectsReadyRef.current = true;
          clearEffectsTimeout();
          setEffectsReady(true);
        }
      }
    }

  });

  if (loading) {
    return null;
  }

  return (
    <group>
      {/* Ground map texture for this planning area */}
      <GroundMapLayer planningAreaId={selectedPlanningArea} />

      {/* Loading progress UI - show only during preparation, hide when ready */}
      {!readyToDisplay && !loading && geometryProgress > 0 && (
        <Html center transform={false} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '24px 48px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            minWidth: '280px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
            top: '50%',
            left: '50%'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>
              Preparing Building Models...
            </div>
            <div style={{
              fontSize: '32px',
              color: '#4a90e2',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {geometryProgress.toFixed(0)}%
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.7,
              marginTop: '8px'
            }}>
              {Math.floor(buildings.length * geometryProgress / 100)} / {buildings.length} buildings
            </div>
            {/* Progress bar using SVG */}
            <svg width="240" height="8" style={{ marginTop: '12px', display: 'block' }}>
              <rect width="240" height="8" rx="4" fill="rgba(255, 255, 255, 0.2)" />
              <rect
                width={Math.round((geometryProgress / 100) * 240)}
                height="8"
                rx="4"
                fill="url(#progressGradient)"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4a90e2" />
                  <stop offset="100%" stopColor="#63b3ed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </Html>
      )}

      {/* Temperature visualization layers */}
      {effectsReady && activeLayer === 'temperature' && (
        <TemperatureFog
          key={`${selectedPlanningArea}-temperature-fog`}
          planningAreaId={selectedPlanningArea}
        />
      )}

      {/* Wind visualization layers */}
      {effectsReady && activeLayer === 'wind' && (
        <WindStreamlines key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Air quality visualization layers */}
      {effectsReady && activeLayer === 'airQuality' && (
        <AirQualityParticles key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Rainfall visualization layers */}
      {effectsReady && activeLayer === 'rainfall' && (
        <RainfallParticles key={selectedPlanningArea} planningAreaId={selectedPlanningArea} />
      )}

      {/* Buildings - using pre-created geometries with growth animation */}
      {readyToDisplay && preparedBuildings.map((prepared, index) => (
        <mesh
          key={`building-${index}`}
          ref={(ref) => {
            if (ref && !animationInitialized.current) {
              buildingMeshRefs.current.push(ref);
              // Set initial scale to 0 on Z axis for growth effect (rotated building)
              ref.scale.set(1, 1, 0);

              // Start animation once all meshes are collected
              if (buildingMeshRefs.current.length === preparedBuildings.length) {
                animationInitialized.current = true;
                buildingAnimating.current = true;
                buildingAnimationStart.current = Date.now();
                clearEffectsTimeout();
                effectsTimeoutRef.current = window.setTimeout(() => {
                  if (!effectsReadyRef.current) {
                    effectsReadyRef.current = true;
                    setEffectsReady(true);
                  }
                }, BUILDING_EFFECT_DELAY);
                console.log(`🎬 Starting animation for ${buildingMeshRefs.current.length} buildings`);
              }
            }
          }}
          position={prepared.position}
          rotation={prepared.rotation}
          geometry={prepared.geometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={prepared.material.color}
            roughness={prepared.material.roughness}
            metalness={prepared.material.metalness}
            emissive={prepared.material.emissive}
            emissiveIntensity={prepared.material.emissiveIntensity}
            envMapIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
