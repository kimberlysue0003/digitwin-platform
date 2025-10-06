// Re-fetch buildings using actual map texture bounds for perfect alignment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function fetchBuildings(areaId) {
  // Load map texture metadata to get ACTUAL bounds
  const mapMetadataPath = path.join(__dirname, `../public/map-textures/${areaId}.json`);

  if (!fs.existsSync(mapMetadataPath)) {
    throw new Error(`Map metadata not found for ${areaId}`);
  }

  const mapMetadata = JSON.parse(fs.readFileSync(mapMetadataPath, 'utf-8'));
  const [[minLat, minLng], [maxLat, maxLng]] = mapMetadata.bounds;
  const geometry = mapMetadata.geometry;

  console.log(`  Using map bounds: [${minLat.toFixed(6)}, ${minLng.toFixed(6)}] to [${maxLat.toFixed(6)}, ${maxLng.toFixed(6)}]`);

  // Fetch from Overpass API
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

  const osmData = await response.json();
  console.log(`  Received ${osmData.elements.length} building elements`);

  // Process buildings using the SAME center calculation as 2D map
  const buildings = [];
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const scale = 111000;

  console.log(`  Using center: [${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}]`);

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
    // Use first polygon for filtering
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

  console.log(`  Processed ${buildings.length} buildings`);

  // Save
  const outputDir = path.join(__dirname, '../public/buildings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputData = {
    planningArea: areaId,
    id: areaId,
    buildingCount: buildings.length,
    buildings: buildings,
    metadata: {
      bounds: mapMetadata.bounds,
      center: [centerLat, centerLng],
      source: 'OpenStreetMap Overpass API',
      fetchedAt: new Date().toISOString(),
      note: 'Coordinates aligned with map texture bounds'
    }
  };

  const outputPath = path.join(outputDir, `${areaId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  return { buildingCount: buildings.length };
}

async function main() {
  const areasToProcess = process.argv.slice(2);

  if (areasToProcess.length === 0) {
    console.log('Usage: node refetchBuildingsWithMapBounds.js <area-id-1> <area-id-2> ...');
    console.log('Example: node refetchBuildingsWithMapBounds.js boon-lay jurong-east');
    process.exit(1);
  }

  console.log(`\n🏗️  Re-fetching Buildings with Map Bounds Alignment`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Areas to process: ${areasToProcess.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < areasToProcess.length; i++) {
    const areaId = areasToProcess[i];
    console.log(`\n🏢 [${i + 1}/${areasToProcess.length}] ${areaId}`);

    try {
      const result = await fetchBuildings(areaId);
      console.log(`   ✅ Saved ${result.buildingCount} buildings`);
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
}

main().catch(console.error);
