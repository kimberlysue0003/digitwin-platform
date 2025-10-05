// Beautiful data visualization cards
import { useEnvironmentStore } from '../stores/environmentStore';

export function DataCards() {
  const { data } = useEnvironmentStore();

  if (!data) return null;

  // Calculate statistics
  const avgTemp = data.temperature?.readings
    ? (data.temperature.readings.reduce((sum, r) => sum + r.value, 0) / data.temperature.readings.length).toFixed(1)
    : null;

  const avgWindSpeed = data.wind?.speed
    ? (data.wind.speed.reduce((sum, r) => sum + r.speed, 0) / data.wind.speed.length).toFixed(1)
    : null;

  const avgPM25 = data.pollution?.pm25
    ? (data.pollution.pm25.reduce((sum, r) => sum + r.pm25, 0) / data.pollution.pm25.length).toFixed(1)
    : null;

  const totalRainfall = data.rainfall?.readings
    ? data.rainfall.readings.reduce((sum, r) => sum + r.value, 0).toFixed(1)
    : null;

  const cards = [
    {
      title: 'Temperature',
      value: avgTemp ? `${avgTemp}°C` : '--',
      icon: '🌡️',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      stations: data.temperature?.readings.length || 0,
    },
    {
      title: 'Wind Speed',
      value: avgWindSpeed ? `${avgWindSpeed} kts` : '--',
      icon: '💨',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      stations: data.wind?.speed.length || 0,
    },
    {
      title: 'PM2.5',
      value: avgPM25 ? `${avgPM25} μg/m³` : '--',
      icon: '🏭',
      color: '#ef4444',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      stations: data.pollution?.pm25.length || 0,
    },
    {
      title: 'Rainfall',
      value: totalRainfall ? `${totalRainfall} mm` : '--',
      icon: '🌧️',
      color: '#06b6d4',
      bgColor: '#ecfeff',
      borderColor: '#a5f3fc',
      stations: data.rainfall?.readings.length || 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            padding: '14px',
            backgroundColor: card.bgColor,
            borderRadius: '8px',
            border: `1px solid ${card.borderColor}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>{card.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
              {card.title}
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: card.color, marginBottom: '2px' }}>
            {card.value}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
            {card.stations} station{card.stations !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
