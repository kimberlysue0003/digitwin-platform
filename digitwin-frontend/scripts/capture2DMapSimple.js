// Capture 2D map view for each planning area, then clip with canvas
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load selected areas
const selectedAreasPath = path.join(__dirname, 'selectedAreas.json');
const selectedAreas = JSON.parse(fs.readFileSync(selectedAreasPath, 'utf-8'));

console.log(`Loaded ${selectedAreas.length} areas to capture\n`);

// Capture map for a specific area
async function captureAreaMap(page, area) {
  console.log(`\nCapturing ${area.name}...`);

  const geometry = area.geometry;
  const coordinates = geometry.coordinates[0]; // First ring of polygon

  // Calculate bounds
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  coordinates.forEach(([lng, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Calculate zoom level
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 15;
  if (maxDiff > 0.05) zoom = 13;
  else if (maxDiff > 0.03) zoom = 14;
  else if (maxDiff > 0.02) zoom = 15;
  else zoom = 16;

  console.log(`  Center: [${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}], Zoom: ${zoom}`);

  // Create GeoJSON for the polygon
  const polygonGeoJSON = JSON.stringify({
    type: "Feature",
    geometry: geometry
  });

  // Create HTML page with Leaflet map
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background: #f0f0f0; }
    #map { width: 2048px; height: 2048px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    // Base map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Add polygon boundary
    const polygon = ${polygonGeoJSON};
    const polygonLayer = L.geoJSON(polygon, {
      style: {
        fill: false,
        color: '#FF0000',
        weight: 3,
        opacity: 0.8
      }
    }).addTo(map);

    // Fit to polygon bounds with padding
    map.fitBounds(polygonLayer.getBounds(), {
      padding: [50, 50]
    });

    // Store polygon screen coordinates for later clipping
    window.polygonScreenCoords = [];
    polygon.geometry.coordinates[0].forEach(coord => {
      const point = map.latLngToContainerPoint([coord[1], coord[0]]);
      window.polygonScreenCoords.push([point.x, point.y]);
    });

    // Signal ready
    window.mapReady = true;
  </script>
</body>
</html>
  `;

  // Set content and wait for map to load
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 15000 });
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for tiles

  // Get polygon screen coordinates
  const polygonScreenCoords = await page.evaluate(() => window.polygonScreenCoords);

  // Take screenshot
  const tempPath = path.join(__dirname, '../public/map-textures', `${area.id}_temp.png`);
  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await page.screenshot({
    path: tempPath,
    clip: {
      x: 0,
      y: 0,
      width: 2048,
      height: 2048
    }
  });

  console.log(`  ✓ Screenshot captured, applying polygon clipping...`);

  // Apply polygon clipping using node-canvas
  const img = await loadImage(tempPath);
  const canvas = createCanvas(2048, 2048);
  const ctx = canvas.getContext('2d');

  // Clear to transparent (important!)
  ctx.clearRect(0, 0, 2048, 2048);

  // Create clipping path from polygon
  ctx.save();
  ctx.beginPath();
  polygonScreenCoords.forEach((coord, i) => {
    if (i === 0) {
      ctx.moveTo(coord[0], coord[1]);
    } else {
      ctx.lineTo(coord[0], coord[1]);
    }
  });
  ctx.closePath();
  ctx.clip();

  // Draw image within clipped region only
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Save final image
  const finalPath = path.join(outputDir, `${area.id}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(finalPath, buffer);

  // Delete temp file
  fs.unlinkSync(tempPath);

  console.log(`  ✓ Saved: ${area.id}.png (2048x2048 with polygon clipping)`);

  // Save metadata
  const metadata = {
    id: area.id,
    name: area.name,
    region: area.region,
    bounds: [[minLat, minLng], [maxLat, maxLng]],
    center: [centerLat, centerLng],
    zoom: zoom,
    size: [2048, 2048],
    geometry: geometry
  };

  const metadataPath = path.join(outputDir, `${area.id}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return true;
}

// Main execution
async function main() {
  console.log('Capturing 2D map views with polygon boundaries...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2048, height: 2048 });

  for (const area of selectedAreas) {
    try {
      await captureAreaMap(page, area);
    } catch (error) {
      console.error(`Error capturing ${area.name}:`, error.message);
    }
  }

  await browser.close();
  console.log('\n✅ Done! All area maps captured with polygon clipping.');
}

main().catch(console.error);
