// Batch fetch real building data for all planning areas from OpenStreetMap
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load areas to process
const areasToProcess = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'areasToProcess.json'), 'utf-8')
);

// Planning areas with bounds (from planningAreas.ts)
const planningAreasPath = path.join(__dirname, '../src/data/planningAreas.ts');
const planningAreasContent = fs.readFileSync(planningAreasPath, 'utf-8');

// Parse planning area bounds from TypeScript file
function parsePlanningAreas() {
  const areas = [];
  const regex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',.*?bounds:\s*\[\[([0-9.]+),\s*([0-9.]+)\],\s*\[([0-9.]+),\s*([0-9.]+)\]\]/gs;

  let match;
  while ((match = regex.exec(planningAreasContent)) !== null) {
    const [, id, name, minLat, minLng, maxLat, maxLng] = match;
    areas.push({
      id,
      name,
      bounds: [[parseFloat(minLat), parseFloat(minLng)], [parseFloat(maxLat), parseFloat(maxLng)]]
    });
  }

  return areas;
}

const PLANNING_AREAS = parsePlanningAreas();

// Check if point is inside polygon (for boundary filtering)
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

// Create boundary polygon from bounds (simple rectangle)
function createBoundaryPolygon(bounds) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat]
  ];
}

// Fetch buildings from Overpass API
async function fetchBuildings(areaId, bounds) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;

  const query = `
[out:json][timeout:90];
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

  const data = await response.json();
  return data;
}

// Process buildings
function processBuildings(osmData, bounds, boundaryPolygon) {
  const buildings = [];

  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const scale = 111000; // meters per degree

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
        boundaryPolygon
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

  return buildings;
}

// Main batch processing
async function main() {
  console.log(`\n🏗️  Batch Fetching Real Building Data`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total areas to process: ${areasToProcess.length}\n`);

  const outputDir = path.join(__dirname, '../public/buildings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < areasToProcess.length; i++) {
    const areaId = areasToProcess[i];
    const areaData = PLANNING_AREAS.find(a => a.id === areaId);

    if (!areaData) {
      console.log(`❌ [${i + 1}/${areasToProcess.length}] ${areaId}: No bounds data found`);
      failCount++;
      continue;
    }

    console.log(`\n📍 [${i + 1}/${areasToProcess.length}] ${areaData.name} (${areaId})`);
    console.log(`   Bounds: [${areaData.bounds[0][0]}, ${areaData.bounds[0][1]}] to [${areaData.bounds[1][0]}, ${areaData.bounds[1][1]}]`);

    try {
      // Fetch from OSM
      console.log(`   Fetching from Overpass API...`);
      const osmData = await fetchBuildings(areaId, areaData.bounds);
      console.log(`   ✓ Received ${osmData.elements.length} building elements`);

      // Process
      console.log(`   Processing buildings...`);
      const boundaryPolygon = createBoundaryPolygon(areaData.bounds);
      const buildings = processBuildings(osmData, areaData.bounds, boundaryPolygon);
      console.log(`   ✓ Processed ${buildings.length} buildings inside area boundary`);

      // Save
      const output = {
        planningArea: areaData.name,
        id: areaId,
        buildingCount: buildings.length,
        buildings: buildings,
        source: 'OpenStreetMap',
        fetched: new Date().toISOString()
      };

      const outputPath = path.join(outputDir, `${areaId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`   ✅ Saved to ${areaId}.json`);

      successCount++;

      // Rate limiting: wait 2 seconds between requests to avoid overwhelming Overpass API
      if (i < areasToProcess.length - 1) {
        console.log(`   ⏳ Waiting 2s before next request...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Batch Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
  console.log(`   Total time: ~${Math.ceil((successCount * 2) / 60)} minutes`);
}

main().catch(console.error);
