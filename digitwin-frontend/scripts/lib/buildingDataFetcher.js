// Reusable module for fetching building data from OpenStreetMap
import fs from 'fs';

/**
 * Point-in-polygon algorithm
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Fetch building data from OpenStreetMap aligned with map texture bounds
 * @param {Object} options Configuration options
 * @param {string} options.areaId Planning area ID
 * @param {Array} options.bounds [[minLat, minLng], [maxLat, maxLng]] - actualBounds from map texture
 * @param {Object} options.geometry GeoJSON geometry for filtering
 * @param {string} options.outputDir Output directory for building JSON
 * @param {number} options.scale Scale factor for coordinate conversion (default: 111000)
 * @param {number} options.timeout API timeout in milliseconds (default: 90000)
 * @returns {Promise<Object>} Building data fetch result
 */
export async function fetchBuildingData(options) {
  const {
    areaId,
    bounds,
    geometry,
    outputDir,
    scale = 111000,
    timeout = 90000
  } = options;

  const [[minLat, minLng], [maxLat, maxLng]] = bounds;

  // Fetch from Overpass API
  const query = `
[out:json][timeout:${timeout / 1000}];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
  relation["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;
`;

  const url = 'https://overpass-api.de/api/interpreter';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const osmData = await response.json();

  // Process buildings using bounds center (same as 2D map)
  const buildings = [];
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  function toLocal(lat, lng) {
    const x = (lng - centerLng) * scale;
    const z = (lat - centerLat) * scale;
    return [x, z];
  }

  // Get polygon for filtering
  let polygonCoords = [];
  if (geometry.type === 'Polygon') {
    polygonCoords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    polygonCoords = geometry.coordinates[0][0];
  }

  for (const element of osmData.elements) {
    if (element.type === 'way' && element.geometry) {
      const nodes = element.geometry;
      if (nodes.length < 3) continue;

      const firstNode = nodes[0];
      const isInArea = isPointInPolygon(
        [firstNode.lon, firstNode.lat],
        polygonCoords
      );

      if (!isInArea) continue;

      const footprint = nodes.map(node => toLocal(node.lat, node.lon));

      // Determine building height
      let height = 15;
      if (element.tags) {
        if (element.tags['building:levels']) {
          const levels = parseInt(element.tags['building:levels']);
          if (!isNaN(levels)) height = levels * 3;
        } else if (element.tags['height']) {
          const h = parseFloat(element.tags['height']);
          if (!isNaN(h)) height = h;
        } else if (element.tags['building:height']) {
          const h = parseFloat(element.tags['building:height']);
          if (!isNaN(h)) height = h;
        }
      }

      buildings.push({ footprint, height });
    }
  }

  // Save building data
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputData = {
    planningArea: areaId,
    id: areaId,
    buildingCount: buildings.length,
    buildings: buildings,
    metadata: {
      bounds,
      center: [centerLat, centerLng],
      source: 'OpenStreetMap Overpass API',
      fetchedAt: new Date().toISOString(),
      note: 'Coordinates aligned with map texture bounds'
    }
  };

  const outputPath = `${outputDir}/${areaId}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  return {
    areaId,
    buildingCount: buildings.length,
    outputPath,
    center: [centerLat, centerLng]
  };
}

/**
 * Load map texture metadata
 * @param {string} metadataPath Path to map texture metadata JSON
 * @returns {Object} Map metadata with bounds and geometry
 */
export function loadMapMetadata(metadataPath) {
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Map metadata not found: ${metadataPath}`);
  }
  return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
}
