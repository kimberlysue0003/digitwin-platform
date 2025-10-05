// Wind streamlines visualization - loads pre-computed paths and animates particles
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface Props {
  planningAreaId: string;
}

interface StreamlineData {
  planningArea: string;
  id: string;
  streamlineCount: number;
  streamlines: Array<{
    direction: string;
    points: number[][];
  }>;
}

export function WindStreamlines({ planningAreaId }: Props) {
  const { data } = useEnvironmentStore();
  const [streamlineData, setStreamlineData] = useState<StreamlineData | null>(null);
  const particleProgress = useRef<number[]>([]);

  // Load pre-computed streamlines
  useEffect(() => {
    const loadStreamlines = async () => {
      try {
        const response = await fetch(`/streamlines/${planningAreaId}.json`);
        if (!response.ok) {
          console.warn(`No streamline data for ${planningAreaId}`);
          return;
        }
        const data: StreamlineData = await response.json();
        setStreamlineData(data);
        console.log(`Loaded ${data.streamlineCount} pre-computed streamlines for ${data.planningArea}`);
      } catch (error) {
        console.error('Failed to load streamlines:', error);
      }
    };
    loadStreamlines();
  }, [planningAreaId]);

  // Get current wind direction and speed from real data
  const currentWind = useMemo(() => {
    if (!data?.wind?.speed || !data?.wind?.direction) {
      return { direction: 'N', speed: 5, directionDeg: 0 };
    }

    // Calculate average wind direction and speed
    let totalSpeed = 0;
    let sinSum = 0;
    let cosSum = 0;

    data.wind.speed.forEach(speedReading => {
      const dirReading = data.wind.direction.find((d: any) => d.station_id === speedReading.station_id);
      if (!dirReading) return;

      const dirRad = (dirReading.direction * Math.PI) / 180;
      sinSum += Math.sin(dirRad) * speedReading.speed;
      cosSum += Math.cos(dirRad) * speedReading.speed;
      totalSpeed += speedReading.speed;
    });

    const avgSpeed = totalSpeed / data.wind.speed.length;
    const avgDirRad = Math.atan2(sinSum, cosSum);
    const avgDirDeg = ((avgDirRad * 180 / Math.PI) + 360) % 360;

    // Convert to 8-direction compass
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const directionIndex = Math.round(avgDirDeg / 45) % 8;
    const direction = directions[directionIndex];

    console.log(`Current wind: ${direction} at ${avgSpeed.toFixed(1)} knots (${avgDirDeg.toFixed(0)}°)`);

    return { direction, speed: avgSpeed, directionDeg: avgDirDeg };
  }, [data]);

  // Filter streamlines that match current wind direction (±45 degrees)
  const activeStreamlines = useMemo(() => {
    if (!streamlineData) return [];

    const currentDir = currentWind.direction;

    // Get streamlines matching current direction and adjacent directions
    const relevantDirs = new Set([currentDir]);

    // Add adjacent directions for smoother transition
    const allDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const currentIdx = allDirs.indexOf(currentDir);
    if (currentIdx >= 0) {
      relevantDirs.add(allDirs[(currentIdx + 1) % 8]);
      relevantDirs.add(allDirs[(currentIdx + 7) % 8]);
    }

    const filtered = streamlineData.streamlines.filter(s => relevantDirs.has(s.direction));

    // Limit number of visible streamlines based on performance
    const maxStreamlines = 80;
    const step = Math.max(1, Math.floor(filtered.length / maxStreamlines));
    const sampled = filtered.filter((_, idx) => idx % step === 0);

    console.log(`Showing ${sampled.length} streamlines for wind direction ${currentDir}`);
    return sampled;
  }, [streamlineData, currentWind.direction]);

  // Get color based on wind speed
  const getSpeedColor = (speed: number): THREE.Color => {
    const color = new THREE.Color();
    if (speed < 5) {
      color.setRGB(0.13, 0.83, 0.88); // Cyan-400
    } else if (speed < 10) {
      color.setRGB(0.02, 0.71, 0.83); // Cyan-500
    } else if (speed < 15) {
      color.setRGB(0.03, 0.54, 0.70); // Cyan-600
    } else {
      color.setRGB(0.05, 0.46, 0.56); // Cyan-700
    }
    return color;
  };

  const speedColor = useMemo(() => getSpeedColor(currentWind.speed), [currentWind.speed]);

  // Animate particles along streamlines
  const [, forceUpdate] = useState({});

  useFrame((state, delta) => {
    if (!activeStreamlines.length) return;

    let needsUpdate = false;

    activeStreamlines.forEach((_, idx) => {
      if (particleProgress.current[idx] === undefined) {
        particleProgress.current[idx] = Math.random();
      }

      // Speed based on current wind speed (minimum 0.5 for visibility, even at low wind)
      const animSpeed = 0.5;

      particleProgress.current[idx] += delta * animSpeed;
      if (particleProgress.current[idx] > 1) {
        particleProgress.current[idx] = 0;
      }
      needsUpdate = true;
    });

    if (needsUpdate) {
      forceUpdate({});
    }
  });

  if (!streamlineData || activeStreamlines.length === 0) return null;

  return (
    <group>
      {activeStreamlines.map((streamline, idx) => {
        if (streamline.points.length < 2) return null;

        // Convert points array to Vector3
        const points = streamline.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));

        // Create smooth curve
        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(Math.min(100, streamline.points.length * 2));

        // Line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

        // Particle position on streamline
        const progress = particleProgress.current[idx] || 0;
        const particlePos = curve.getPoint(progress);

        // Get tangent for arrow direction
        const tangent = curve.getTangent(progress);

        return (
          <group key={idx}>
            {/* Streamline path - much more visible */}
            <line geometry={geometry}>
              <lineBasicMaterial
                color={speedColor}
                opacity={0.7}
                transparent
                linewidth={3}
              />
            </line>

            {/* Moving particle - simple glowing sphere */}
            <mesh position={[particlePos.x, particlePos.y, particlePos.z]}>
              <sphereGeometry args={[6, 16, 16]} />
              <meshStandardMaterial
                color={speedColor}
                emissive={speedColor}
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
