// Generate map tiles for each planning area
// Uses OpenStreetMap tiles and composites them per area

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Planning areas with bounds
const PLANNING_AREAS = [
  { id: 'downtown-core', name: 'Downtown Core', bounds: [[1.2650, 103.8350], [1.2950, 103.8650]] },
  { id: 'marina-south', name: 'Marina South', bounds: [[1.2500, 103.8500], [1.2800, 103.8800]] },
  { id: 'museum', name: 'Museum', bounds: [[1.2850, 103.8400], [1.3100, 103.8600]] },
  { id: 'newton', name: 'Newton', bounds: [[1.3050, 103.8300], [1.3250, 103.8500]] },
  { id: 'orchard', name: 'Orchard', bounds: [[1.2950, 103.8200], [1.3150, 103.8450]] },
  // Add more areas as needed - starting with first 5 for testing
];

// Convert lat/lng to tile coordinates
function latLngToTile(lat, lng, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Get tile bounds in lat/lng
function tileToBounds(x, y, zoom) {
  const n = 2 ** zoom;
  const lng_min = x / n * 360 - 180;
  const lng_max = (x + 1) / n * 360 - 180;

  const n_lat_min = Math.PI * (1 - 2 * (y + 1) / n);
  const lat_min = Math.atan(Math.sinh(n_lat_min)) * 180 / Math.PI;

  const n_lat_max = Math.PI * (1 - 2 * y / n);
  const lat_max = Math.atan(Math.sinh(n_lat_max)) * 180 / Math.PI;

  return { lat_min, lat_max, lng_min, lng_max };
}

// Download a tile image from OpenStreetMap
async function downloadTile(x, y, zoom) {
  // Use OSM tile servers (a/b/c for load balancing)
  const servers = ['a', 'b', 'c'];
  const server = servers[Math.floor(Math.random() * servers.length)];
  const url = `https://${server}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DigitalTwin-Platform/1.0'
      }
    });
    if (!response.ok) {
      console.warn(`Failed to fetch tile ${zoom}/${y}/${x}: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return await loadImage(buffer);
  } catch (error) {
    console.warn(`Error fetching tile ${zoom}/${y}/${x}:`, error.message);
    return null;
  }
}

// Generate satellite image for a planning area
async function generateAreaSatelliteImage(area) {
  console.log(`\nProcessing ${area.name}...`);

  const [[minLat, minLng], [maxLat, maxLng]] = area.bounds;
  const zoom = 15; // High detail zoom level

  // Get tile range for this area
  const minTile = latLngToTile(maxLat, minLng, zoom); // NW corner
  const maxTile = latLngToTile(minLat, maxLng, zoom); // SE corner

  const tilesX = maxTile.x - minTile.x + 1;
  const tilesY = maxTile.y - minTile.y + 1;

  console.log(`  Tile range: ${tilesX}x${tilesY} tiles`);

  // Create canvas for compositing
  const canvasWidth = tilesX * 256;
  const canvasHeight = tilesY * 256;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Fill with transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Download and composite tiles
  let successCount = 0;
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tileX = minTile.x + tx;
      const tileY = minTile.y + ty;

      const img = await downloadTile(tileX, tileY, zoom);
      if (img) {
        ctx.drawImage(img, tx * 256, ty * 256, 256, 256);
        successCount++;
      }

      // Delay to respect OSM tile usage policy (max 2 requests/sec)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`  Downloaded ${successCount}/${tilesX * tilesY} tiles`);

  // Save to file
  const outputDir = path.join(__dirname, '../public/map-tiles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${area.id}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`  ✓ Saved: ${area.id}.png (${canvasWidth}x${canvasHeight})`);

  // Also save metadata
  const metadata = {
    id: area.id,
    name: area.name,
    bounds: area.bounds,
    zoom: zoom,
    tileRange: {
      minX: minTile.x,
      minY: minTile.y,
      maxX: maxTile.x,
      maxY: maxTile.y
    },
    imageSize: {
      width: canvasWidth,
      height: canvasHeight
    }
  };

  const metadataPath = path.join(outputDir, `${area.id}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return true;
}

// Main execution
async function main() {
  console.log('Generating map tiles for planning areas...\n');

  for (const area of PLANNING_AREAS) {
    try {
      await generateAreaSatelliteImage(area);
    } catch (error) {
      console.error(`Failed to process ${area.name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
}

main();
