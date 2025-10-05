// Calculate alignment parameters between 2D map and 3D buildings
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildingPath = path.join(__dirname, '../public/buildings/choa-chu-kang.json');
const buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf-8'));

const mapPath = path.join(__dirname, '../public/map-textures/choa-chu-kang.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

// 1. Calculate 3D building boundary
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

const building3DBounds = {
  minX, maxX, minZ, maxZ,
  width: maxX - minX,
  height: maxZ - minZ,
  centerX: (minX + maxX) / 2,
  centerZ: (minZ + maxZ) / 2
};

console.log('3D Building Boundary:');
console.log(`  X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (width: ${building3DBounds.width.toFixed(2)}m)`);
console.log(`  Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (height: ${building3DBounds.height.toFixed(2)}m)`);
console.log(`  Center: [${building3DBounds.centerX.toFixed(2)}, ${building3DBounds.centerZ.toFixed(2)}]`);

// 2. Calculate 2D map boundary (in 3D coordinates)
const [[minLat, minLng], [maxLat, maxLng]] = mapData.bounds;
const scale = 111000;

// Use the same center as buildings used
const centerLat = (minLat + maxLat) / 2;
const centerLng = (minLng + maxLng) / 2;

const map2DBounds = {
  minX: (minLng - centerLng) * scale,
  maxX: (maxLng - centerLng) * scale,
  minZ: (minLat - centerLat) * scale,
  maxZ: (maxLat - centerLat) * scale
};

map2DBounds.width = map2DBounds.maxX - map2DBounds.minX;
map2DBounds.height = map2DBounds.maxZ - map2DBounds.minZ;
map2DBounds.centerX = (map2DBounds.minX + map2DBounds.maxX) / 2;
map2DBounds.centerZ = (map2DBounds.minZ + map2DBounds.maxZ) / 2;

console.log('\n2D Map Boundary (converted to 3D):');
console.log(`  X: ${map2DBounds.minX.toFixed(2)} to ${map2DBounds.maxX.toFixed(2)} (width: ${map2DBounds.width.toFixed(2)}m)`);
console.log(`  Z: ${map2DBounds.minZ.toFixed(2)} to ${map2DBounds.maxZ.toFixed(2)} (height: ${map2DBounds.height.toFixed(2)}m)`);
console.log(`  Center: [${map2DBounds.centerX.toFixed(2)}, ${map2DBounds.centerZ.toFixed(2)}]`);

// 3. Calculate alignment parameters
const scaleX = map2DBounds.width / building3DBounds.width;
const scaleZ = map2DBounds.height / building3DBounds.height;

const offsetX = map2DBounds.centerX - building3DBounds.centerX;
const offsetZ = map2DBounds.centerZ - building3DBounds.centerZ;

console.log('\nAlignment Parameters:');
console.log(`  Scale X: ${scaleX.toFixed(4)} (should use map width: ${map2DBounds.width.toFixed(2)}m)`);
console.log(`  Scale Z: ${scaleZ.toFixed(4)} (should use map height: ${map2DBounds.height.toFixed(2)}m)`);
console.log(`  Offset X: ${offsetX.toFixed(2)}m`);
console.log(`  Offset Z: ${offsetZ.toFixed(2)}m`);

console.log('\nRecommendation:');
console.log(`  - Map plane size should be: [${map2DBounds.width.toFixed(2)}, ${map2DBounds.height.toFixed(2)}]`);
console.log(`  - Map plane position should be: [${map2DBounds.centerX.toFixed(2)}, 0, ${map2DBounds.centerZ.toFixed(2)}]`);
