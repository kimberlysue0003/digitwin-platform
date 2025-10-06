// Main 3D scene component
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { TemperatureLayer } from './TemperatureLayer';
import { AirQualityLayer } from './AirQualityLayer';
import { RainfallLayer } from './RainfallLayer';
import { BuildingsLayer } from './BuildingsLayer';
import { GroundOverlay } from './GroundOverlay';

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
        {/* Background color - realistic sky gradient */}
        <color attach="background" args={['#a0d8f0']} />
        <fog attach="fog" args={['#b8d8e8', 5000, 15000]} />

        {/* Lighting - multi-light setup for realism */}
        <ambientLight intensity={0.4} color="#b8d4e8" />

        {/* Main sun light */}
        <directionalLight
          position={[3000, 4000, 2000]}
          intensity={1.8}
          color="#ffffeb"
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-2000}
          shadow-camera-right={2000}
          shadow-camera-top={2000}
          shadow-camera-bottom={-2000}
          shadow-camera-near={0.5}
          shadow-camera-far={10000}
          shadow-bias={-0.0001}
        />

        {/* Fill light from opposite side */}
        <directionalLight
          position={[-2000, 3000, -1000]}
          intensity={0.5}
          color="#c8d8f0"
        />

        {/* Rim light for edges */}
        <directionalLight
          position={[0, 2000, -3000]}
          intensity={0.3}
          color="#f0e8d8"
        />

        {/* Hemisphere light for sky/ground ambient */}
        <hemisphereLight
          args={['#87CEEB', '#e5e7eb', 0.6]}
          position={[0, 1000, 0]}
        />

        {/* Buildings */}
        <BuildingsLayer />

        {/* Visualization layers - moved to BuildingsLayer for better integration */}
        {/* Temperature grid removed - using HeatParticles in BuildingsLayer instead */}
        {/* {activeLayer === 'temperature' && <TemperatureLayer />} */}
        {/* AirQuality now uses particles in BuildingsLayer */}
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
