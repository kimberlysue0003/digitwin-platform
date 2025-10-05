// Main 3D scene component
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { TemperatureLayer } from './TemperatureLayer';
import { WindLayer } from './WindLayer';
import { AirQualityLayer } from './AirQualityLayer';
import { RainfallLayer } from './RainfallLayer';
import { BuildingsLayer } from './BuildingsLayer';

export function CityScene() {
  const { activeLayer } = useEnvironmentStore();
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [500, 500, 1500],
          fov: 60,
          near: 1,
          far: 100000,
        }}
        shadows
      >
        {/* Background color */}
        <color attach="background" args={['#87CEEB']} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[1000, 2000, 500]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Ground plane - clean gray */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20000, 20000]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>

        {/* Grid helper for reference */}
        <gridHelper args={[10000, 50, '#9ca3af', '#d1d5db']} position={[0, 0.5, 0]} />

        {/* Real buildings from OpenStreetMap */}
        <BuildingsLayer />

        {/* Visualization layers */}
        {activeLayer === 'temperature' && <TemperatureLayer />}
        {activeLayer === 'wind' && <WindLayer />}
        {activeLayer === 'airQuality' && <AirQualityLayer />}
        {activeLayer === 'rainfall' && <RainfallLayer />}

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={100}
          maxDistance={10000}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
