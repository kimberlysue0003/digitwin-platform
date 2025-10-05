// Toggle between 2D and 3D view modes
import { useEnvironmentStore } from '../stores/environmentStore';

export function ViewModeSwitcher() {
  const { viewMode, setViewMode, selectedRegion } = useEnvironmentStore();

  return (
    <div
      style={{
        position: 'absolute',
        top: '80px',
        left: '20px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* View mode toggle */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('2d')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === '2d' ? '#667eea' : 'transparent',
              color: viewMode === '2d' ? 'white' : '#6b7280',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🗺️ 2D Map
          </button>
          <button
            onClick={() => setViewMode('3d')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === '3d' ? '#667eea' : 'transparent',
              color: viewMode === '3d' ? 'white' : '#6b7280',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🏙️ 3D View
          </button>
        </div>
      </div>

      {/* Current region indicator (shown in 3D mode) */}
      {viewMode === '3d' && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
            Viewing Region
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
            {selectedRegion}
          </div>
        </div>
      )}
    </div>
  );
}
