// Hook to calculate area temperature using same logic as DataCards
import { useMemo, useEffect, useState } from 'react';
import { useEnvironmentStore } from '../stores/environmentStore';

export function useAreaTemperature(planningAreaId: string): number | null {
  const { data } = useEnvironmentStore();
  const [mapMetadata, setMapMetadata] = useState<any>(null);

  // Load map metadata from backend API
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/map-textures/${planningAreaId}`);
        if (!response.ok) return;
        const apiResponse = await response.json();
        const data = apiResponse.data;

        // Transform API response to expected format
        const metadata = {
          bounds: [
            [data.bounds_min_lat, data.bounds_min_lng],
            [data.bounds_max_lat, data.bounds_max_lng]
          ],
          center: [data.center_lat, data.center_lng]
        };
        setMapMetadata(metadata);
      } catch (error) {
        console.error('Failed to load map metadata:', error);
      }
    };

    loadMetadata();
  }, [planningAreaId]);

  // Calculate interpolated temperature
  const temperature = useMemo(() => {
    if (!data?.temperature || !mapMetadata) return null;

    const { stations, readings } = data.temperature;
    if (!stations || !readings || stations.length === 0 || readings.length === 0) {
      return null;
    }

    const [centerLat, centerLng] = mapMetadata.center;
    const scale = 111000;
    const x = 0; // Area center in local coordinates
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
  }, [data, mapMetadata]);

  return temperature;
}
