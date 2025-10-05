// Component to fetch real-time data from NEA API
import { useEffect } from 'react';
import { useEnvironmentStore } from '../stores/environmentStore';

export function DataFetcher() {
  const { updateData, setConnected } = useEnvironmentStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all environmental data in parallel
        const [tempRes, windSpeedRes, windDirRes, pm25Res, rainfallRes] = await Promise.all([
          fetch('https://api-open.data.gov.sg/v2/real-time/api/air-temperature'),
          fetch('https://api-open.data.gov.sg/v2/real-time/api/wind-speed'),
          fetch('https://api-open.data.gov.sg/v2/real-time/api/wind-direction'),
          fetch('https://api-open.data.gov.sg/v2/real-time/api/pm25'),
          fetch('https://api-open.data.gov.sg/v2/real-time/api/rainfall'),
        ]);

        const [tempData, windSpeedData, windDirData, pm25Data, rainfallData] = await Promise.all([
          tempRes.json(),
          windSpeedRes.json(),
          windDirRes.json(),
          pm25Res.json(),
          rainfallRes.json(),
        ]);

        // Transform NEA data to our format
        const transformedData = {
          timestamp: new Date().toISOString(),
          temperature: {
            stations: tempData.data?.stations || [],
            readings: (tempData.data?.readings?.[0]?.data || []).map((r: any) => ({
              station_id: r.stationId,
              value: r.value,
            })),
          },
          wind: {
            stations: windSpeedData.data?.stations || [],
            speed: (windSpeedData.data?.readings?.[0]?.data || []).map((r: any) => ({
              station_id: r.stationId,
              speed: r.value,
            })),
            direction: (windDirData.data?.readings?.[0]?.data || []).map((r: any) => ({
              station_id: r.stationId,
              direction: r.value,
            })),
          },
          rainfall: {
            stations: rainfallData.data?.stations || [],
            readings: (rainfallData.data?.readings?.[0]?.data || []).map((r: any) => ({
              station_id: r.stationId,
              value: r.value,
            })),
          },
          pollution: {
            pm25: Object.entries(pm25Data.data?.items?.[0]?.readings?.pm25_one_hourly || {}).map(([region, value]: [string, any]) => ({
              region: region.toLowerCase(),
              pm25: value,
              psi: 0,
            })),
            psi: [],
          },
        };

        updateData(transformedData);
        setConnected(true);
      } catch (error) {
        console.error('Failed to fetch NEA data:', error);
        setConnected(false);
      }
    };

    // Initial fetch
    fetchData();

    // Fetch every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [updateData, setConnected]);

  return null; // This component doesn't render anything
}
