// Fetch natural features (water bodies and forests) from OpenStreetMap
// Uses Overpass API to get real data for Singapore

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singapore bounding box
const SINGAPORE_BBOX = {
  south: 1.15,
  west: 103.6,
  north: 1.47,
  east: 104.05
};

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Query for water bodies
const WATER_QUERY = `
[out:json][timeout:60];
(
  // Rivers and streams
  way["waterway"~"river|stream|canal"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  // Lakes, reservoirs, ponds
  way["natural"="water"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  way["water"~"lake|reservoir|pond"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  // Relation water bodies
  relation["natural"="water"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
);
out geom;
`;

// Query for forests and green spaces
const FOREST_QUERY = `
[out:json][timeout:60];
(
  // Forests and woods
  way["natural"="wood"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  way["landuse"="forest"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  // Parks and nature reserves
  way["leisure"="park"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  way["leisure"="nature_reserve"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  way["boundary"="national_park"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  // Relation green spaces
  relation["leisure"="park"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
  relation["natural"="wood"](${SINGAPORE_BBOX.south},${SINGAPORE_BBOX.west},${SINGAPORE_BBOX.north},${SINGAPORE_BBOX.east});
);
out geom;
`;

// Fetch data from Overpass API
async function fetchOverpassData(query) {
  console.log('Fetching data from Overpass API...');

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: query,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Convert lat/lng to local 3D coordinates (centered at Singapore)
function latLngTo3D(lat, lng) {
  const centerLat = 1.3521;
  const centerLng = 103.8198;
  const scale = 111000; // meters per degree

  const x = (lng - centerLng) * scale;
  const z = -(lat - centerLat) * scale;

  return { x, z };
}

// Process water bodies
function processWaterBodies(data) {
  const waterBodies = [];

  data.elements.forEach(element => {
    if (element.type === 'way' && element.geometry) {
      const coordinates = element.geometry.map(node => {
        const pos = latLngTo3D(node.lat, node.lon);
        return [pos.x, pos.z];
      });

      waterBodies.push({
        type: element.tags?.waterway || element.tags?.water || 'water',
        name: element.tags?.name || undefined,
        coordinates: coordinates
      });
    }
  });

  return waterBodies;
}

// Process forests and green spaces
function processGreenSpaces(data) {
  const greenSpaces = [];

  data.elements.forEach(element => {
    if (element.type === 'way' && element.geometry) {
      const coordinates = element.geometry.map(node => {
        const pos = latLngTo3D(node.lat, node.lon);
        return [pos.x, pos.z];
      });

      greenSpaces.push({
        type: element.tags?.natural || element.tags?.leisure || element.tags?.landuse || 'forest',
        name: element.tags?.name || undefined,
        coordinates: coordinates
      });
    }
  });

  return greenSpaces;
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, '../public/natural-features');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Fetch water bodies
    console.log('\n🌊 Fetching water bodies (rivers, lakes, reservoirs)...');
    const waterData = await fetchOverpassData(WATER_QUERY);
    const waterBodies = processWaterBodies(waterData);
    console.log(`✓ Found ${waterBodies.length} water bodies`);

    fs.writeFileSync(
      path.join(outputDir, 'water.json'),
      JSON.stringify({ count: waterBodies.length, features: waterBodies }, null, 2)
    );

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch forests and green spaces
    console.log('\n🌳 Fetching forests and green spaces (parks, nature reserves)...');
    const forestData = await fetchOverpassData(FOREST_QUERY);
    const greenSpaces = processGreenSpaces(forestData);
    console.log(`✓ Found ${greenSpaces.length} green spaces`);

    fs.writeFileSync(
      path.join(outputDir, 'green-spaces.json'),
      JSON.stringify({ count: greenSpaces.length, features: greenSpaces }, null, 2)
    );

    console.log('\n✅ Successfully fetched all natural features!');
    console.log(`   Water bodies: ${waterBodies.length}`);
    console.log(`   Green spaces: ${greenSpaces.length}`);

  } catch (error) {
    console.error('\n❌ Error fetching data:', error.message);
    process.exit(1);
  }
}

main();
