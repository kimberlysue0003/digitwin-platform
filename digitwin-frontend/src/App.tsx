import { CityScene } from './components/3d/CityScene';
import { MapView } from './components/2d/MapView';
import { StatusPanel } from './components/StatusPanel';
import { ControlPanel } from './components/ControlPanel';
import { DataFetcher } from './components/DataFetcher';
import { ViewModeSwitcher } from './components/ViewModeSwitcher';
import { useEnvironmentStore } from './stores/environmentStore';

function App() {
  const { viewMode } = useEnvironmentStore();

  return (
    <>
      <DataFetcher />

    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Top Bar - Subtle gradient */}
      <div
        style={{
          height: '60px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'white' }}>
            Singapore Urban Digital Twin Platform
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
          Real-time Environmental Monitoring System
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: '280px',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <StatusPanel />
        </div>

        {/* Center - View (2D Map or 3D Scene) */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#f9fafb'
        }}>
          <ViewModeSwitcher />
          {viewMode === '2d' ? <MapView /> : <CityScene />}
          <ControlPanel />
        </div>

        {/* Right Sidebar */}
        <div
          style={{
            width: '280px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1f2937',
            paddingBottom: '8px',
            borderBottom: '2px solid #3b82f6'
          }}>
            Data Overview
          </h3>
          <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
            <div style={{
              padding: '14px',
              backgroundColor: '#eff6ff',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
              marginBottom: '12px'
            }}>
              <div style={{ fontWeight: '500', color: '#1e40af', marginBottom: '4px', fontSize: '13px' }}>
                Real-time Updates
              </div>
              <div style={{ fontSize: '12px', color: '#4b5563' }}>
                Environmental data from 50+ monitoring stations
              </div>
            </div>
            <div style={{
              padding: '14px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              border: '1px solid #fde68a',
            }}>
              <div style={{ fontWeight: '500', color: '#92400e', marginBottom: '4px', fontSize: '13px' }}>
                Data Source
              </div>
              <div style={{ fontSize: '12px', color: '#4b5563' }}>
                NEA Singapore Open Data Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default App;
