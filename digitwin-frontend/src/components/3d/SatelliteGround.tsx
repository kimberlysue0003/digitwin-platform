// Satellite imagery ground texture using real map tiles
import { useEffect, useState } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

interface Props {
  planningAreaId: string;
  bounds: [[number, number], [number, number]]; // [[minLat, minLng], [maxLat, maxLng]]
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Calculate optimal zoom level
function calculateZoom(bounds: [[number, number], [number, number]]): number {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  if (maxDiff > 0.3) return 11;
  if (maxDiff > 0.2) return 12;
  if (maxDiff > 0.1) return 13;
  if (maxDiff > 0.05) return 14;
  return 15;
}

export function SatelliteGround({ planningAreaId, bounds }: Props) {
  const [textureUrl, setTextureUrl] = useState<string>('');

  useEffect(() => {
    // Use ESRI World Imagery (satellite) tiles
    const [[minLat, minLng], [maxLat, maxLng]] = bounds;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const zoom = calculateZoom(bounds);

    // Get tile coordinates
    const tile = latLngToTile(centerLat, centerLng, zoom);

    // ESRI satellite imagery tile URL (free, no API key needed)
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.x}`;

    setTextureUrl(url);
  }, [planningAreaId, bounds]);

  if (!textureUrl) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0.6}>
        <primitive attach="map" object={new THREE.TextureLoader().load(textureUrl)} />
      </meshBasicMaterial>
    </mesh>
  );
}
