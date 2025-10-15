// Hook to calculate area rainfall using same logic as DataCards
import { useMemo } from 'react';
import { useEnvironmentStore } from '../stores/environmentStore';
import { PLANNING_AREAS } from '../data/planningAreas';

export function useAreaRainfall(planningAreaId: string): number {
  const { data } = useEnvironmentStore();

  const rainfall = useMemo(() => {
    if (!data?.rainfall?.readings || !data?.rainfall?.stations) {
      return 0;
    }

    const { stations, readings } = data.rainfall;

    // Helper function: Check if station is within area bounds
    const isStationInArea = (station: any, bounds: [[number, number], [number, number]]) => {
      const lat = station.location.latitude;
      const lng = station.location.longitude;
      const [[minLat, minLng], [maxLat, maxLng]] = bounds;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    };

    // IDW interpolation function
    const interpolateRainfall = (): number => {
      const currentArea = PLANNING_AREAS.find(pa => pa.id === planningAreaId);
      if (!currentArea) return 0;

      const [areaLat, areaLng] = currentArea.center;
      const centerLat = 1.3521; // Singapore center
      const centerLng = 103.8198;
      const scale = 111000; // meters per degree

      const x = (areaLng - centerLng) * scale;
      const z = (areaLat - centerLat) * scale;

      let weightedRain = 0;
      let totalWeight = 0;

      readings.forEach((reading: any) => {
        const station = stations.find((s: any) => s.station_id === reading.station_id);
        if (!station) return;

        const stationX = (station.location.longitude - centerLng) * scale;
        const stationZ = (station.location.latitude - centerLat) * scale;

        const dx = x - stationX;
        const dz = z - stationZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Only consider stations within 10km
        const maxInfluenceDistance = 10000;
        if (distance > maxInfluenceDistance) return;

        // IDW with power=3 for stronger decay
        const weight = 1 / Math.pow(Math.max(distance, 100), 3);
        weightedRain += reading.value * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? weightedRain / totalWeight : 0;
    };

    // Step 1: Check if there's a weather station within this area's bounds
    const currentArea = PLANNING_AREAS.find(pa => pa.id === planningAreaId);

    if (currentArea) {
      const localStations = stations.filter((s: any) => isStationInArea(s, currentArea.bounds));
      const localReadings = readings.filter((r: any) =>
        localStations.some((s: any) => s.station_id === r.station_id)
      );

      // Step 2: If we have local station(s), use their data directly
      if (localReadings.length > 0) {
        const avgRainfall = localReadings.reduce((sum: number, r: any) => sum + r.value, 0) / localReadings.length;
        console.log(`🌧️ Rainfall for ${planningAreaId}: ${avgRainfall.toFixed(2)} mm (LOCAL STATION - ${localReadings.length} station(s))`);
        return avgRainfall;
      }
      // Step 3: No local station, use IDW interpolation
      else {
        const avgRainfall = interpolateRainfall();
        console.log(`🌧️ Rainfall for ${planningAreaId}: ${avgRainfall.toFixed(2)} mm (IDW interpolation)`);
        return avgRainfall;
      }
    }

    return 0;
  }, [data, planningAreaId]);

  return rainfall;
}
