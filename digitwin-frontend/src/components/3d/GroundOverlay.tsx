// Real satellite imagery ground texture
import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface Props {
  planningAreaId: string;
  bounds: [[number, number], [number, number]];
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Calculate zoom level
function calculateZoom(bounds: [[number, number], [number, number]]): number {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  if (maxDiff > 0.3) return 12;
  if (maxDiff > 0.2) return 13;
  if (maxDiff > 0.1) return 14;
  if (maxDiff > 0.05) return 15;
  return 16;
}

export function GroundOverlay({ planningAreaId, bounds }: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loadSatelliteImage = async () => {
      try {
        const [[minLat, minLng], [maxLat, maxLng]] = bounds;
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const zoom = calculateZoom(bounds);

        // Get center tile
        const centerTile = latLngToTile(centerLat, centerLng, zoom);

        // Load a 3x3 grid of tiles for better coverage
        const canvas = document.createElement('canvas');
        canvas.width = 768; // 3 tiles * 256px
        canvas.height = 768;
        const ctx = canvas.getContext('2d')!;

        const tilePromises = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = centerTile.x + dx;
            const y = centerTile.y + dy;

            // ESRI World Imagery (free satellite tiles)
            const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;

            tilePromises.push(
              new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  const canvasX = (dx + 1) * 256;
                  const canvasY = (dy + 1) * 256;
                  ctx.drawImage(img, canvasX, canvasY, 256, 256);
                  resolve(true);
                };
                img.onerror = () => {
                  console.warn(`Failed to load tile: ${url}`);
                  resolve(false);
                };
                img.src = url;
              })
            );
          }
        }

        await Promise.all(tilePromises);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        setTexture(tex);

        console.log(`Loaded satellite imagery for ${planningAreaId}`);

      } catch (error) {
        console.error('Failed to load satellite imagery:', error);
      }
    };

    loadSatelliteImage();
  }, [planningAreaId, bounds]);

  if (!texture) {
    // Fallback: simple gray ground
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial color="#d4d8dc" roughness={0.95} metalness={0.05} />
      </mesh>
    );
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20000, 20000]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}
