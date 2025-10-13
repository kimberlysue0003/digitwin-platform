// Ground map layer - displays pre-processed 2D map textures for each planning area
import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  planningAreaId: string;
}

export function GroundMapLayer({ planningAreaId }: Props) {
  const [metadata, setMetadata] = useState<any>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/map-textures/${planningAreaId}`);
        if (!response.ok) {
          console.warn(`No map texture metadata for ${planningAreaId}`);
          return;
        }

        const apiResponse = await response.json();
        const data = apiResponse.data;

        // Transform API response to expected format
        const transformedData = {
          bounds: [
            [data.bounds_min_lat, data.bounds_min_lng],
            [data.bounds_max_lat, data.bounds_max_lng]
          ],
          center: [data.center_lat, data.center_lng],
          zoom: data.zoom,
          size: [data.width, data.height]
        };

        setMetadata(transformedData);
        setTextureUrl(`http://localhost:8080${data.png_file_path}`);
      } catch (error) {
        console.error('Failed to load map texture metadata:', error);
      }
    };

    loadMetadata();
  }, [planningAreaId]);

  if (!textureUrl || !metadata) return null;

  return <GroundMapTexture textureUrl={textureUrl} metadata={metadata} />;
}

function GroundMapTexture({ textureUrl, metadata }: { textureUrl: string; metadata: any }) {
  const texture = useTexture(textureUrl);

  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;
    }
  }, [texture]);

  const [[minLat, minLng], [maxLat, maxLng]] = metadata.bounds;
  const scale = 111000;

  const width = (maxLng - minLng) * scale;
  const height = (maxLat - minLat) * scale;

  // PNG texture is already clipped to polygon shape with transparency
  // Both 2D map and 3D buildings use bounds center for coordinate transformation
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        alphaTest={0.1}
        roughness={1.0}
        metalness={0.0}
      />
    </mesh>
  );
}
