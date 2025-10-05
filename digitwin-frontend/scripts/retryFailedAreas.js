// Retry failed areas with longer delays and retry mechanism
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Failed areas that need retry
const failedAreas = [
  { id: 'museum', name: 'Museum', bounds: [[1.285, 103.84], [1.31, 103.86]] },
  { id: 'outram', name: 'Outram', bounds: [[1.27, 103.825], [1.29, 103.85]] },
  { id: 'river-valley', name: 'River Valley', bounds: [[1.285, 103.825], [1.305, 103.85]] },
  { id: 'rochor', name: 'Rochor', bounds: [[1.295, 103.84], [1.315, 103.865]] },
  { id: 'singapore-river', name: 'Singapore River', bounds: [[1.28, 103.84], [1.295, 103.86]] },
  { id: 'straits-view', name: 'Straits View', bounds: [[1.285, 103.855], [1.295, 103.87]] },
  { id: 'tanglin', name: 'Tanglin', bounds: [[1.295, 103.8], [1.315, 103.83]] },
  { id: 'sungei-kadut', name: 'Sungei Kadut', bounds: [[1.4, 103.735], [1.425, 103.765]] },
  { id: 'north-eastern-islands', name: 'North-Eastern Islands', bounds: [[1.39, 103.94], [1.43, 103.98]] },
  { id: 'sengkang', name: 'Sengkang', bounds: [[1.37, 103.875], [1.405, 103.91]] },
  { id: 'geylang', name: 'Geylang', bounds: [[1.305, 103.875], [1.335, 103.91]] }
];

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

async function fetchBuildings(areaId, bounds, retryCount = 0) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;

  const query = `
[out:json][timeout:120];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
  relation["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;
`;

  const url = 'https://overpass-api.de/api/interpreter';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 504) {
        if (retryCount < 3) {
          const waitTime = (retryCount + 1) * 10000; // 10s, 20s, 30s
          console.log(`   ⚠️  HTTP ${response.status}, waiting ${waitTime/1000}s before retry ${retryCount + 1}/3...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return fetchBuildings(areaId, bounds, retryCount + 1);
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (retryCount < 3) {
      const waitTime = (retryCount + 1) * 10000;
      console.log(`   ⚠️  ${error.message}, waiting ${waitTime/1000}s before retry ${retryCount + 1}/3...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchBuildings(areaId, bounds, retryCount + 1);
    }
    throw error;
  }
}

function processBuildings(osmData, bounds, boundaryPolygon) {
  const buildings = [];

  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const scale = 111000;

  function toLocal(lat, lng) {
    const x = (lng - centerLng) * scale;
    const z = (lat - centerLat) * scale;
    return [x, z];
  }

  for (const element of osmData.elements) {
    if (element.type === 'way' && element.geometry) {
      const nodes = element.geometry;

      if (nodes.length < 3) continue;

      const firstNode = nodes[0];
      const isInArea = isPointInPolygon(
        [firstNode.lon, firstNode.lat],
        boundaryPolygon
      );

      if (!isInArea) continue;

      const footprint = nodes.map(node => toLocal(node.lat, node.lon));

      let height = 15;

      if (element.tags) {
        if (element.tags['building:levels']) {
          const levels = parseInt(element.tags['building:levels']);
          if (!isNaN(levels)) {
            height = levels * 3;
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
          height = 45;
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

async function main() {
  console.log(`\n🔄 Retrying Failed Areas`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total failed areas to retry: ${failedAreas.length}`);
  console.log(`Using 5s delay + exponential backoff retry (up to 3 retries)\n`);

  const outputDir = path.join(__dirname, '../public/buildings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < failedAreas.length; i++) {
    const area = failedAreas[i];

    console.log(`\n📍 [${i + 1}/${failedAreas.length}] ${area.name} (${area.id})`);
    console.log(`   Bounds: [${area.bounds[0][0]}, ${area.bounds[0][1]}] to [${area.bounds[1][0]}, ${area.bounds[1][1]}]`);

    try {
      console.log(`   Fetching from Overpass API...`);
      const osmData = await fetchBuildings(area.id, area.bounds);
      console.log(`   ✓ Received ${osmData.elements.length} building elements`);

      console.log(`   Processing buildings...`);
      const boundaryPolygon = createBoundaryPolygon(area.bounds);
      const buildings = processBuildings(osmData, area.bounds, boundaryPolygon);
      console.log(`   ✓ Processed ${buildings.length} buildings inside area boundary`);

      const output = {
        planningArea: area.name,
        id: area.id,
        buildingCount: buildings.length,
        buildings: buildings,
        source: 'OpenStreetMap',
        fetched: new Date().toISOString()
      };

      const outputPath = path.join(outputDir, `${area.id}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`   ✅ Saved to ${area.id}.json`);

      successCount++;

      // Longer delay between requests (5 seconds)
      if (i < failedAreas.length - 1) {
        console.log(`   ⏳ Waiting 5s before next request...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Retry Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
}

main().catch(console.error);
