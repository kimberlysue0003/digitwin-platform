// Fetch real building data for Choa Chu Kang from OpenStreetMap
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load map metadata to get ACTUAL bounds used by Leaflet
const mapMetadataPath = path.join(__dirname, '../public/map-textures/choa-chu-kang.json');
const mapMetadata = JSON.parse(fs.readFileSync(mapMetadataPath, 'utf-8'));

// Use actual bounds from map capture
const [[minLat, minLng], [maxLat, maxLng]] = mapMetadata.bounds;
const geometry = mapMetadata.geometry;
const coordinates = geometry.coordinates[0];

console.log(`Fetching buildings for Choa Chu Kang...`);
console.log(`  Bounds: [${minLat}, ${minLng}] to [${maxLat}, ${maxLng}]`);

// Build Overpass QL query
const query = `
[out:json][timeout:90];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
  relation["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;
`;

async function fetchBuildings() {
  const url = 'https://overpass-api.de/api/interpreter';

  console.log('  Sending request to Overpass API...');

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

  const data = await response.json();
  console.log(`  ✓ Received ${data.elements.length} building elements`);

  return data;
}

// Check if point is inside polygon
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

// Process buildings
function processBuildings(osmData) {
  console.log('  Processing buildings...');

  const buildings = [];

  // Area center (calculate from actual bounds to match map texture)
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const scale = 111000; // meters per degree

  console.log(`  Using center: [${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}]`);

  // Convert lat/lng to local coordinates
  function toLocal(lat, lng) {
    const x = (lng - centerLng) * scale;
    const z = (lat - centerLat) * scale;
    return [x, z];
  }

  for (const element of osmData.elements) {
    if (element.type === 'way' && element.geometry) {
      const nodes = element.geometry;

      if (nodes.length < 3) continue;

      // Get first node to check if building is in area
      const firstNode = nodes[0];
      const isInArea = isPointInPolygon(
        [firstNode.lon, firstNode.lat],
        coordinates
      );

      if (!isInArea) continue;

      // Convert coordinates to local
      const footprint = nodes.map(node => toLocal(node.lat, node.lon));

      // Estimate height
      let height = 15; // Default 5 floors

      if (element.tags) {
        if (element.tags['building:levels']) {
          const levels = parseInt(element.tags['building:levels']);
          if (!isNaN(levels)) {
            height = levels * 3; // 3m per floor
          }
        } else if (element.tags['height']) {
          const h = parseFloat(element.tags['height']);
          if (!isNaN(h)) {
            height = h;
          }
        } else if (element.tags['building:height']) {
          const h = parseFloat(element.tags['building:height']);
          if (!isNaN(h)) {
            height = h;
          }
        } else if (element.tags['building'] === 'apartments') {
          height = 45; // Typical HDB
        } else if (element.tags['building'] === 'commercial' || element.tags['building'] === 'retail') {
          height = 20;
        } else if (element.tags['building'] === 'house') {
          height = 6;
        }
      }

      buildings.push({
        footprint,
        height
      });
    }
  }

  console.log(`  ✓ Processed ${buildings.length} buildings inside area boundary`);

  return buildings;
}

async function main() {
  try {
    const osmData = await fetchBuildings();
    const buildings = processBuildings(osmData);

    // Save
    const output = {
      planningArea: 'Choa Chu Kang',
      id: 'choa-chu-kang',
      buildingCount: buildings.length,
      buildings: buildings,
      source: 'OpenStreetMap',
      fetched: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '../public/buildings/choa-chu-kang.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n✅ Saved ${buildings.length} buildings to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
