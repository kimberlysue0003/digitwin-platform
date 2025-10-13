// Temperature-based linear fog with animated near/far breathing
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAreaTemperature } from '../../hooks/useAreaTemperature';
import { useMapBounds } from '../../hooks/useMapBounds';

interface TemperatureFogProps {
  planningAreaId: string;
}

const COLOR_STOPS: Array<{ limit: number; color: THREE.Color }> = [
  { limit: 26, color: new THREE.Color('#3b82f6') },
  { limit: 28, color: new THREE.Color('#10b981') },
  { limit: 30, color: new THREE.Color('#fbbf24') },
  { limit: Infinity, color: new THREE.Color('#ef4444') },
];

const pickColor = (temp: number) => {
  for (const stop of COLOR_STOPS) {
    if (temp < stop.limit) {
      return stop.color.clone();
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
};

export function TemperatureFog({ planningAreaId }: TemperatureFogProps) {
  const { scene } = useThree();
  const fogRef = useRef<THREE.Fog | null>(null);
  const baseNearRef = useRef(30);
  const baseFarRef = useRef(300);

  const areaTemperature = useAreaTemperature(planningAreaId) ?? 27;
  const mapBounds = useMapBounds(planningAreaId);

  const intensity = useMemo(
    () => THREE.MathUtils.clamp((areaTemperature - 25) / 6, 0, 1),
    [areaTemperature]
  );
  const fogColor = useMemo(() => pickColor(areaTemperature), [areaTemperature]);

  const { baseNear, baseFar } = useMemo(() => {
    const extent = Math.max(mapBounds.width || 600, mapBounds.height || 600, 600);
    const near = 35 + extent * 0.05 * (0.5 + intensity * 0.8);
    const far = extent * (0.6 + intensity * 0.4) + 220;
    return { baseNear: near, baseFar: far };
  }, [mapBounds.width, mapBounds.height, intensity]);

  useEffect(() => {
    const fog = new THREE.Fog(fogColor.getHex(), baseNear, baseFar);
    fogRef.current = fog;
    baseNearRef.current = baseNear;
    baseFarRef.current = baseFar;
    scene.fog = fog;

    return () => {
      if (scene.fog === fog) {
        scene.fog = null;
      }
    };
  }, [scene]);

  useEffect(() => {
    if (!fogRef.current) return;
    fogRef.current.color.copy(fogColor);
  }, [fogColor]);

  useEffect(() => {
    if (!fogRef.current) return;
    fogRef.current.near = baseNear;
    fogRef.current.far = baseFar;
    baseNearRef.current = baseNear;
    baseFarRef.current = baseFar;
  }, [baseNear, baseFar]);

  useFrame(({ clock }) => {
    if (!fogRef.current) return;

    const t = clock.elapsedTime;
    const waveA = Math.sin(t * 0.5) * 0.55;
    const waveB = Math.sin(t * 0.83 + 0.9) * 0.35;
    const combined = (waveA + waveB) * 0.5;
    const pulse = (Math.sin(t * 0.32 + 1.1) + 1) * 0.5;

    const nearAmp = baseNearRef.current * (0.04 + intensity * 0.08);
    const farAmp = baseFarRef.current * (0.025 + intensity * 0.06);

    fogRef.current.near = THREE.MathUtils.clamp(
      baseNearRef.current + nearAmp * (combined * 0.7 + pulse * 0.3),
      5,
      baseFarRef.current * 0.9
    );
    fogRef.current.far =
      baseFarRef.current +
      farAmp * (combined * 0.6 + pulse * 0.4);
  });

  return null;
}
