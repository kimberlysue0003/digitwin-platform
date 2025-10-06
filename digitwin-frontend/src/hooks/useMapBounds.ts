// Hook for loading map metadata and alpha channel data
// Provides reusable map boundary detection for particle systems
import { useState, useEffect } from 'react';

interface MapMetadata {
  bounds: [[number, number], [number, number]]; // [[minLat, minLng], [maxLat, maxLng]]
  center: [number, number]; // [lat, lng]
}

interface MapBounds {
  metadata: MapMetadata | null;
  alphaData: Uint8ClampedArray | null;
  textureWidth: number;
  textureHeight: number;
  width: number;  // 3D world width in meters
  height: number; // 3D world height in meters
  isNonTransparent: (x: number, y: number) => boolean;
  isLoaded: boolean;
}

const SCALE = 111000; // meters per degree

export function useMapBounds(planningAreaId: string): MapBounds {
  const [metadata, setMetadata] = useState<MapMetadata | null>(null);
  const [alphaData, setAlphaData] = useState<Uint8ClampedArray | null>(null);
  const [textureWidth, setTextureWidth] = useState(0);
  const [textureHeight, setTextureHeight] = useState(0);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load metadata
        const metaResponse = await fetch(`/map-textures/${planningAreaId}.json`);
        if (!metaResponse.ok) {
          console.warn(`No map metadata for ${planningAreaId}`);
          return;
        }
        const metadataJson = await metaResponse.json();
        setMetadata(metadataJson);

        // Load texture and extract alpha channel
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.error('Failed to get canvas context');
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          setAlphaData(imageData.data);
          setTextureWidth(canvas.width);
          setTextureHeight(canvas.height);
        };
        img.onerror = () => console.error('Failed to load map texture');
        img.src = `/map-textures/${planningAreaId}.png`;
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, [planningAreaId]);

  // Calculate 3D world dimensions
  const width = metadata
    ? (metadata.bounds[1][1] - metadata.bounds[0][1]) * SCALE
    : 0;
  const height = metadata
    ? (metadata.bounds[1][0] - metadata.bounds[0][0]) * SCALE
    : 0;

  // Helper function to check if a texture pixel is non-transparent
  const isNonTransparent = (x: number, y: number): boolean => {
    if (!alphaData || x < 0 || x >= textureWidth || y < 0 || y >= textureHeight) {
      return false;
    }
    const idx = (y * textureWidth + x) * 4;
    return alphaData[idx + 3] > 128; // Alpha > 128 = non-transparent
  };

  const isLoaded = metadata !== null && alphaData !== null;

  return {
    metadata,
    alphaData,
    textureWidth,
    textureHeight,
    width,
    height,
    isNonTransparent,
    isLoaded
  };
}
