// Real-time station data list
import { useEnvironmentStore } from '../stores/environmentStore';

export function StationsList() {
  const { data } = useEnvironmentStore();

  if (!data?.temperature?.readings) return null;

  // Get top 5 stations with highest temperature
  const topStations = [...data.temperature.readings]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#1f2937',
        paddingBottom: '6px',
        borderBottom: '2px solid #f59e0b'
      }}>
        Hottest Stations
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {topStations.map((station, index) => {
          const stationInfo = data.temperature?.stations?.find(
            (s: any) => s.id === station.station_id
          );

          return (
            <div
              key={`station-${station.station_id}-${index}`}
              style={{
                padding: '10px 12px',
                backgroundColor: index === 0 ? '#fef3c7' : '#f9fafb',
                borderRadius: '6px',
                border: index === 0 ? '1px solid #fde68a' : '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>
                  {stationInfo?.name || station.station_id}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                  {stationInfo?.location?.latitude.toFixed(4)}, {stationInfo?.location?.longitude.toFixed(4)}
                </div>
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: index === 0 ? '#f59e0b' : '#3b82f6',
              }}>
                {station.value}°C
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
