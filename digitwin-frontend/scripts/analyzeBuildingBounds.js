// Analyze building data bounds and compare with map texture
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load building data
const buildingPath = path.join(__dirname, '../public/buildings/choa-chu-kang.json');
const buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf-8'));

// Load map metadata
const mapPath = path.join(__dirname, '../public/map-textures/choa-chu-kang.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

console.log('=== BUILDING DATA ANALYSIS ===\n');

// Calculate actual building bounds
let minX = Infinity, maxX = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (const building of buildingData.buildings) {
  for (const [x, z] of building.footprint) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
}

console.log('Building Data (3D coordinates):');
console.log(`  X range: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (width: ${(maxX - minX).toFixed(2)}m)`);
console.log(`  Z range: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (height: ${(maxZ - minZ).toFixed(2)}m)`);
console.log(`  Center: [${((minX + maxX) / 2).toFixed(2)}, ${((minZ + maxZ) / 2).toFixed(2)}]`);

console.log('\n=== MAP TEXTURE ANALYSIS ===\n');

const [[minLat, minLng], [maxLat, maxLng]] = mapData.bounds;
const [centerLat, centerLng] = mapData.center;
const scale = 111000;

console.log('Map Metadata:');
console.log(`  Center (lat/lng): [${centerLat}, ${centerLng}]`);
console.log(`  Bounds: [${minLat}, ${minLng}] to [${maxLat}, ${maxLng}]`);

// Convert map bounds to 3D coordinates
const mapMinX = (minLng - centerLng) * scale;
const mapMaxX = (maxLng - centerLng) * scale;
const mapMinZ = (minLat - centerLat) * scale;
const mapMaxZ = (maxLat - centerLat) * scale;

console.log('\nMap Texture (3D coordinates):');
console.log(`  X range: ${mapMinX.toFixed(2)} to ${mapMaxX.toFixed(2)} (width: ${(mapMaxX - mapMinX).toFixed(2)}m)`);
console.log(`  Z range: ${mapMinZ.toFixed(2)} to ${mapMaxZ.toFixed(2)} (height: ${(mapMaxZ - mapMinZ).toFixed(2)}m)`);
console.log(`  Center: [${((mapMinX + mapMaxX) / 2).toFixed(2)}, ${((mapMinZ + mapMaxZ) / 2).toFixed(2)}]`);

console.log('\n=== COMPARISON ===\n');

const xOffset = ((minX + maxX) / 2) - ((mapMinX + mapMaxX) / 2);
const zOffset = ((minZ + maxZ) / 2) - ((mapMinZ + mapMaxZ) / 2);

console.log('Offset (Building center - Map center):');
console.log(`  X offset: ${xOffset.toFixed(2)}m`);
console.log(`  Z offset: ${zOffset.toFixed(2)}m`);

const xOverhang = Math.max(0, minX - mapMinX, maxX - mapMaxX);
const zOverhang = Math.max(0, minZ - mapMinZ, maxZ - mapMaxZ);

console.log('\nOverhang (Buildings beyond map bounds):');
console.log(`  X overhang: ${xOverhang > 0 ? xOverhang.toFixed(2) + 'm' : 'None'}`);
console.log(`  Z overhang: ${zOverhang > 0 ? zOverhang.toFixed(2) + 'm' : 'None'}`);

console.log('\nBuildings outside map bounds:');
console.log(`  Min X: ${minX < mapMinX ? 'YES (' + (mapMinX - minX).toFixed(2) + 'm beyond)' : 'No'}`);
console.log(`  Max X: ${maxX > mapMaxX ? 'YES (' + (maxX - mapMaxX).toFixed(2) + 'm beyond)' : 'No'}`);
console.log(`  Min Z: ${minZ < mapMinZ ? 'YES (' + (mapMinZ - minZ).toFixed(2) + 'm beyond)' : 'No'}`);
console.log(`  Max Z: ${maxZ > mapMaxZ ? 'YES (' + (maxZ - mapMaxZ).toFixed(2) + 'm beyond)' : 'No'}`);
