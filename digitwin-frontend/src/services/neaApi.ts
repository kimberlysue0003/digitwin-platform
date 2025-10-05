// Direct NEA API client (for testing without backend)
const NEA_BASE_URL = 'https://api-open.data.gov.sg/v2/real-time/api';

export async function fetchTemperature() {
  const response = await fetch(`${NEA_BASE_URL}/air-temperature`);
  if (!response.ok) throw new Error('Failed to fetch temperature');
  return response.json();
}

export async function fetchWindSpeed() {
  const response = await fetch(`${NEA_BASE_URL}/wind-speed`);
  if (!response.ok) throw new Error('Failed to fetch wind speed');
  return response.json();
}

export async function fetchWindDirection() {
  const response = await fetch(`${NEA_BASE_URL}/wind-direction`);
  if (!response.ok) throw new Error('Failed to fetch wind direction');
  return response.json();
}

export async function fetchPM25() {
  const response = await fetch(`${NEA_BASE_URL}/pm25`);
  if (!response.ok) throw new Error('Failed to fetch PM2.5');
  return response.json();
}

export async function fetchPSI() {
  const response = await fetch(`${NEA_BASE_URL}/psi`);
  if (!response.ok) throw new Error('Failed to fetch PSI');
  return response.json();
}

export async function fetchRainfall() {
  const response = await fetch(`${NEA_BASE_URL}/rainfall`);
  if (!response.ok) throw new Error('Failed to fetch rainfall');
  return response.json();
}

// Fetch all environment data
export async function fetchAllEnvironmentData() {
  const [temp, windSpeed, windDirection, pm25, psi, rainfall] = await Promise.all([
    fetchTemperature(),
    fetchWindSpeed(),
    fetchWindDirection(),
    fetchPM25(),
    fetchPSI(),
    fetchRainfall(),
  ]);

  return {
    temperature: temp,
    windSpeed,
    windDirection,
    pm25,
    psi,
    rainfall,
  };
}
