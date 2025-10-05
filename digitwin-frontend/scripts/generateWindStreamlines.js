// Pre-compute wind streamlines for each planning area
// This script generates streamline paths that avoid buildings
// Runtime only needs to load JSON and animate particles along these paths

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      // Distance to line segment
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
        // Normal points outward from edge
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

  // Normalize direction
  const dirMag = Math.sqrt(directionX ** 2 + directionZ ** 2);
  let dirX = directionX / dirMag;
  let dirZ = directionZ / dirMag;

  for (let step = 0; step < maxSteps; step++) {
    // Check if inside building
    if (isInsideBuilding(x, z, buildings)) {
      // Get normal to nearest boundary
      const normal = findNearestBoundary(x, z, buildings);

      // Deflect along the boundary (90 degree rotation of normal)
      dirX = -normal.z;
      dirZ = normal.x;

      // Move along boundary
      x += dirX * stepSize;
      z += dirZ * stepSize;

      // If still inside after deflection, stop
      if (isInsideBuilding(x, z, buildings)) {
        break;
      }
    }

    // Add point to streamline
    points.push([
      Math.round(x * 100) / 100,
      Math.round(y * 100) / 100,
      Math.round(z * 100) / 100
    ]);

    // Add slight vertical variation
    y += (Math.random() - 0.5) * 1.5;
    y = Math.max(10, Math.min(y, 120));

    // Move in current direction
    x += dirX * stepSize;
    z += dirZ * stepSize;

    // Stop if out of bounds (with margin)
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
  console.log(`\nGenerating streamlines for ${planningAreaId}...`);

  // Load building data
  const buildingPath = path.join(__dirname, '../public/buildings', `${planningAreaId}.json`);
  if (!fs.existsSync(buildingPath)) {
    console.log(`No building data found for ${planningAreaId}`);
    return null;
  }

  const buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf8'));
  const buildings = buildingData.buildings;
  const bounds = getBuildingBounds(buildings);

  console.log(`Building bounds: x[${bounds.minX.toFixed(0)}, ${bounds.maxX.toFixed(0)}], z[${bounds.minZ.toFixed(0)}, ${bounds.maxZ.toFixed(0)}]`);

  const streamlines = [];

  // Generate streamlines from multiple directions
  const directions = [
    { x: 1, z: 0, name: 'E' },      // East
    { x: 0.707, z: 0.707, name: 'NE' },  // Northeast
    { x: 0, z: 1, name: 'N' },      // North
    { x: -0.707, z: 0.707, name: 'NW' }, // Northwest
    { x: -1, z: 0, name: 'W' },     // West
    { x: -0.707, z: -0.707, name: 'SW' }, // Southwest
    { x: 0, z: -1, name: 'S' },     // South
    { x: 0.707, z: -0.707, name: 'SE' }  // Southeast
  ];

  const areaWidth = bounds.maxX - bounds.minX;
  const areaHeight = bounds.maxZ - bounds.minZ;

  // For each direction, create seed points in grid pattern across entire area
  directions.forEach(dir => {
    const gridSize = 10; // Grid of seed points
    const heightLayers = 3; // Different height layers

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        for (let h = 0; h < heightLayers; h++) {
          // Position seeds in grid across entire area
          const startX = bounds.minX + (gx + 0.5) / gridSize * areaWidth;
          const startZ = bounds.minZ + (gz + 0.5) / gridSize * areaHeight;
          const startY = 20 + h * 35;

          // Skip if starting inside building
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

  console.log(`Generated ${streamlines.length} streamlines`);

  return {
    planningArea: buildingData.planningArea,
    id: planningAreaId,
    streamlineCount: streamlines.length,
    streamlines: streamlines
  };
}

// Main execution
const planningAreaId = process.argv[2] || 'choa-chu-kang';

console.log('=== Wind Streamline Generator ===');
const data = generateStreamlinesForArea(planningAreaId);

if (data) {
  // Save output
  const outputDir = path.join(__dirname, '../public/streamlines');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${planningAreaId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}
