// Batch generate wind streamlines for all planning areas
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load areas to process
const areasToProcess = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'areasToProcess.json'), 'utf-8')
);

// Point in polygon test (ray casting)
function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], zi = polygon[i][1];
    const xj = polygon[j][0], zj = polygon[j][1];

    const intersect = ((zi > z) !== (zj > z))
      && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if point is inside any building
function isInsideBuilding(x, z, buildings) {
  for (const building of buildings) {
    if (pointInPolygon(x, z, building.footprint)) {
      return true;
    }
  }
  return false;
}

// Get building bounds
function getBuildingBounds(buildings) {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  buildings.forEach(building => {
    building.footprint.forEach(([x, z]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });
  });
  return { minX, maxX, minZ, maxZ };
}

// Find nearest building boundary when inside
function findNearestBoundary(x, z, buildings) {
  let minDist = Infinity;
  let nearestNormal = { x: 0, z: 1 };

  for (const building of buildings) {
    const footprint = building.footprint;
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      const x1 = footprint[i][0], z1 = footprint[i][1];
      const x2 = footprint[j][0], z2 = footprint[j][1];

      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.001) continue;

      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (len * len)));
      const nearX = x1 + t * dx;
      const nearZ = z1 + t * dz;

      const dist = Math.sqrt((x - nearX) ** 2 + (z - nearZ) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearestNormal = { x: -dz / len, z: dx / len };
      }
    }
  }

  return nearestNormal;
}

// Generate streamline avoiding buildings
function generateStreamline(startX, startZ, startY, directionX, directionZ, buildings, bounds, maxSteps = 200) {
  const points = [];
  let x = startX;
  let z = startZ;
  let y = startY;
  const stepSize = 12;

  const dirMag = Math.sqrt(directionX ** 2 + directionZ ** 2);
  let dirX = directionX / dirMag;
  let dirZ = directionZ / dirMag;

  for (let step = 0; step < maxSteps; step++) {
    if (isInsideBuilding(x, z, buildings)) {
      const normal = findNearestBoundary(x, z, buildings);
      dirX = -normal.z;
      dirZ = normal.x;
      x += dirX * stepSize;
      z += dirZ * stepSize;
      if (isInsideBuilding(x, z, buildings)) {
        break;
      }
    }

    points.push([
      Math.round(x * 100) / 100,
      Math.round(y * 100) / 100,
      Math.round(z * 100) / 100
    ]);

    y += (Math.random() - 0.5) * 1.5;
    y = Math.max(10, Math.min(y, 120));

    x += dirX * stepSize;
    z += dirZ * stepSize;

    const margin = 50;
    if (x < bounds.minX - margin || x > bounds.maxX + margin ||
        z < bounds.minZ - margin || z > bounds.maxZ + margin) {
      break;
    }
  }

  return points;
}

// Generate streamlines for a planning area
function generateStreamlinesForArea(planningAreaId) {
  // Load building data
  const buildingPath = path.join(__dirname, '../public/buildings', `${planningAreaId}.json`);
  if (!fs.existsSync(buildingPath)) {
    return null;
  }

  const buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf8'));
  const buildings = buildingData.buildings;
  const bounds = getBuildingBounds(buildings);

  const streamlines = [];

  // Generate streamlines from 8 directions
  const directions = [
    { x: 1, z: 0, name: 'E' },
    { x: 0.707, z: 0.707, name: 'NE' },
    { x: 0, z: 1, name: 'N' },
    { x: -0.707, z: 0.707, name: 'NW' },
    { x: -1, z: 0, name: 'W' },
    { x: -0.707, z: -0.707, name: 'SW' },
    { x: 0, z: -1, name: 'S' },
    { x: 0.707, z: -0.707, name: 'SE' }
  ];

  const areaWidth = bounds.maxX - bounds.minX;
  const areaHeight = bounds.maxZ - bounds.minZ;

  directions.forEach(dir => {
    const gridSize = 10;
    const heightLayers = 3;

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        for (let h = 0; h < heightLayers; h++) {
          const startX = bounds.minX + (gx + 0.5) / gridSize * areaWidth;
          const startZ = bounds.minZ + (gz + 0.5) / gridSize * areaHeight;
          const startY = 20 + h * 35;

          if (isInsideBuilding(startX, startZ, buildings)) continue;

          const points = generateStreamline(startX, startZ, startY, dir.x, dir.z, buildings, bounds);

          if (points.length > 15) {
            streamlines.push({
              direction: dir.name,
              points: points
            });
          }
        }
      }
    }
  });

  return {
    planningArea: buildingData.planningArea,
    id: planningAreaId,
    streamlineCount: streamlines.length,
    streamlines: streamlines
  };
}

// Main batch processing
async function main() {
  console.log(`\n🌬️  Batch Generating Wind Streamlines`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total areas to process: ${areasToProcess.length}\n`);

  const outputDir = path.join(__dirname, '../public/streamlines');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;
  let totalStreamlines = 0;

  for (let i = 0; i < areasToProcess.length; i++) {
    const areaId = areasToProcess[i];

    console.log(`\n🌀 [${i + 1}/${areasToProcess.length}] ${areaId}`);

    try {
      const data = generateStreamlinesForArea(areaId);

      if (!data) {
        console.log(`   ❌ No building data found, skipping`);
        failCount++;
        continue;
      }

      const outputPath = path.join(outputDir, `${areaId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

      const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
      console.log(`   ✓ Generated ${data.streamlineCount} streamlines`);
      console.log(`   ✅ Saved ${fileSize} KB to ${areaId}.json`);

      totalStreamlines += data.streamlineCount;
      successCount++;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Batch Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
  console.log(`   Total streamlines: ${totalStreamlines.toLocaleString()}`);
}

main().catch(console.error);
