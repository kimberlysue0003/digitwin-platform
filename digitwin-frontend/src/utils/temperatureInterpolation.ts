// Shared temperature interpolation logic for 3D view

export interface InterpolationParams {
  centerLat: number;
  centerLng: number;
  stations: any[];
  readings: any[];
}

export function interpolateTemperature(params: InterpolationParams): number | null {
  const { centerLat, centerLng, stations, readings } = params;

  if (!stations || !readings || stations.length === 0 || readings.length === 0) {
    return null;
  }

  const scale = 111000; // meters per degree
  const x = 0; // Area center in local coordinate system
  const z = 0;

  let weightedValue = 0;
  let totalWeight = 0;

  readings.forEach((reading: any) => {
    const station = stations.find((s: any) => s.station_id === reading.station_id || s.id === reading.station_id);
    if (!station) return;

    const stationX = (station.location.longitude - centerLng) * scale;
    const stationZ = (station.location.latitude - centerLat) * scale;

    const dx = x - stationX;
    const dz = z - stationZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const weight = distance < 100 ? 1000 : 1 / (distance * distance);
    weightedValue += reading.value * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedValue / totalWeight : null;
}
