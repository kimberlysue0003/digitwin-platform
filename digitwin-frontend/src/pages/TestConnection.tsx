// Test page to verify connection to Go backend
import { useEffect, useState } from 'react';
import { checkHealth, fetchPlanningAreas, fetchBuildingsByArea } from '../services/apiService';
import { buildWebSocketUrl, API_CONFIG } from '../config/api';

export function TestConnection() {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [areasCount, setAreasCount] = useState<number>(0);
  const [buildingsCount, setBuildingsCount] = useState<number>(0);
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test health endpoint
        const health = await checkHealth();
        setHealthStatus(`✅ Healthy - DB: ${health.database.status}, Redis: ${health.redis.status}`);

        // Test areas endpoint
        const areas = await fetchPlanningAreas();
        setAreasCount(areas.length);

        // Test buildings endpoint (fetch first area)
        if (areas.length > 0) {
          const buildings = await fetchBuildingsByArea(areas[0].id);
          setBuildingsCount(buildings.length);
        }

        // Test WebSocket
        const ws = new WebSocket(buildWebSocketUrl());
        ws.onopen = () => setWsStatus('✅ Connected');
        ws.onerror = () => setWsStatus('❌ Connection failed');
        ws.onclose = () => setWsStatus('⚠️ Disconnected');

        return () => ws.close();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHealthStatus('❌ Failed');
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '30px', color: '#1f2937' }}>
        🧪 Backend Connection Test
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Health Check */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>Health Check</h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>{healthStatus}</div>
        </div>

        {/* Planning Areas */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>Planning Areas</h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {areasCount > 0 ? `✅ Loaded ${areasCount} areas` : '⏳ Loading...'}
          </div>
        </div>

        {/* Buildings */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>Buildings</h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {buildingsCount > 0 ? `✅ Loaded ${buildingsCount} buildings from first area` : '⏳ Loading...'}
          </div>
        </div>

        {/* WebSocket */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>WebSocket</h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>{wsStatus}</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '20px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#991b1b' }}>Error</h2>
            <div style={{ fontSize: '14px', color: '#7f1d1d' }}>{error}</div>
          </div>
        )}

        {/* API URLs */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>Configuration</h2>
          <div style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
            <div>API URL: {API_CONFIG.BASE_URL}</div>
            <div>WebSocket: {API_CONFIG.WS_URL}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <a href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>← Back to Main App</a>
      </div>
    </div>
  );
}
