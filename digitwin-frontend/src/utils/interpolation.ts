// Inverse Distance Weighting (IDW) interpolation for environmental data

interface DataPoint {
  x: number;
  z: number;
  value: number;
}

/**
 * Inverse Distance Weighting interpolation
 * @param gridX - X coordinate of the point to interpolate
 * @param gridZ - Z coordinate of the point to interpolate
 * @param dataPoints - Array of known data points with x, z, value
 * @param power - Power parameter (default: 2)
 * @returns Interpolated value
 */
export function interpolateIDW(
  gridX: number,
  gridZ: number,
  dataPoints: DataPoint[],
  power: number = 2
): number {
  if (dataPoints.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  for (const point of dataPoints) {
    const dx = gridX - point.x;
    const dz = gridZ - point.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If we're very close to a data point, return its value directly
    if (distance < 1) {
      return point.value;
    }

    const weight = 1 / Math.pow(distance, power);
    weightedSum += weight * point.value;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Create a grid of interpolated values
 * @param dataPoints - Array of known data points
 * @param gridSize - Number of grid points in each dimension
 * @param bounds - { minX, maxX, minZ, maxZ }
 * @returns 2D array of interpolated values
 */
export function createInterpolatedGrid(
  dataPoints: DataPoint[],
  gridSize: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): number[][] {
  const grid: number[][] = [];
  const stepX = (bounds.maxX - bounds.minX) / (gridSize - 1);
  const stepZ = (bounds.maxZ - bounds.minZ) / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const x = bounds.minX + i * stepX;
      const z = bounds.minZ + j * stepZ;
      grid[i][j] = interpolateIDW(x, z, dataPoints);
    }
  }

  return grid;
}

/**
 * Convert lat/lng to local coordinates (Singapore-centric)
 */
export function latLngToLocal(lat: number, lng: number): { x: number; z: number } {
  const centerLat = 1.3521;
  const centerLng = 103.8198;
  const scale = 100000;

  const x = (lng - centerLng) * scale;
  const z = -(lat - centerLat) * scale;

  return { x, z };
}
