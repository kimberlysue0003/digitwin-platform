// API configuration for the Digital Twin backend
export const API_CONFIG = {
  // Go backend base URL
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080',

  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',

  // API endpoints
  ENDPOINTS: {
    AREAS: '/api/areas',
    BUILDINGS: '/api/buildings',
    STREAMLINES: '/api/streamlines',
    MAP_TEXTURES: '/api/map-textures',
    HEALTH: '/health',
  },

  // Request timeout (ms)
  TIMEOUT: 30000,
};

// Helper function to build full URL
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Helper function to build WebSocket URL with area ID
export function buildWebSocketUrl(areaId?: string): string {
  if (areaId) {
    return `${API_CONFIG.WS_URL}?areaId=${areaId}`;
  }
  return API_CONFIG.WS_URL;
}
