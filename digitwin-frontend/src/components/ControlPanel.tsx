// Control panel for toggling different visualization layers
import { useEnvironmentStore, VisualizationLayer } from '../stores/environmentStore';

export function ControlPanel() {
  const { activeLayer, setActiveLayer } = useEnvironmentStore();

  const layers = [
    { id: 'temperature' as VisualizationLayer, label: '🌡️ Temperature', color: '#f59e0b' },
    { id: 'wind' as VisualizationLayer, label: '💨 Wind Field', color: '#3b82f6' },
    { id: 'airQuality' as VisualizationLayer, label: '🏭 Air Quality', color: '#ef4444' },
    { id: 'rainfall' as VisualizationLayer, label: '🌧️ Rainfall', color: '#06b6d4' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        minWidth: '200px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
      }}
    >
      <h3 style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#1f2937',
        paddingBottom: '6px',
        borderBottom: '2px solid #3b82f6'
      }}>
        Visualization Layer
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: activeLayer === layer.id ? `2px solid ${layer.color}` : '1px solid #e5e7eb',
              backgroundColor: activeLayer === layer.id
                ? `${layer.color}10`
                : 'white',
              color: activeLayer === layer.id ? layer.color : '#6b7280',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeLayer === layer.id ? '500' : '400',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (activeLayer !== layer.id) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (activeLayer !== layer.id) {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {activeLayer && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '11px',
            color: '#9ca3af',
          }}
        >
          Active: <span style={{ color: layers.find((l) => l.id === activeLayer)?.color, fontWeight: '500' }}>
            {layers.find((l) => l.id === activeLayer)?.label}
          </span>
        </div>
      )}
    </div>
  );
}
