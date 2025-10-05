// Status panel showing connection and data status
import { useEnvironmentStore } from '../stores/environmentStore';
import { DataCards } from './DataCards';
import { StationsList } from './StationsList';

export function StatusPanel() {
  const { connected, lastUpdate } = useEnvironmentStore();

  return (
    <div>
      <h2 style={{
        fontSize: '15px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#1f2937',
        paddingBottom: '8px',
        borderBottom: '2px solid #3b82f6'
      }}>
        System Status
      </h2>

      <div style={{
        padding: '14px',
        backgroundColor: connected ? '#ecfdf5' : '#fef2f2',
        borderRadius: '6px',
        border: connected ? '1px solid #d1fae5' : '1px solid #fecaca',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#10b981' : '#ef4444',
            }}
          />
          <span style={{
            fontWeight: '500',
            color: connected ? '#065f46' : '#991b1b',
            fontSize: '13px'
          }}>
            {connected ? 'Live Data' : 'Disconnected'}
          </span>
        </div>

        {lastUpdate && (
          <div style={{ color: '#6b7280', fontSize: '12px' }}>
            {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <DataCards />
      <StationsList />
    </div>
  );
}
