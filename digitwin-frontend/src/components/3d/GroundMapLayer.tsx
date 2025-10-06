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
        const response = await fetch(`/map-textures/${planningAreaId}.json`);
        if (!response.ok) {
          console.warn(`No map texture metadata for ${planningAreaId}`);
          return;
        }

        const data = await response.json();
        setMetadata(data);
        setTextureUrl(`/map-textures/${planningAreaId}.png`);
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
  // Just use a simple plane to display it
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
