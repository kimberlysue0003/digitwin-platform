// Capture 2D map view for each planning area - full rectangular map
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const coordinates = geometry.coordinates[0];

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

  console.log(`  Bounds: [${minLat.toFixed(4)}, ${minLng.toFixed(4)}] to [${maxLat.toFixed(4)}, ${maxLng.toFixed(4)}]`);
  console.log(`  Zoom: ${zoom}`);

  // Create GeoJSON for the polygon boundary
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
    body { margin: 0; padding: 0; }
    #map { width: 2048px; height: 2048px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    });

    // Base map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Add polygon boundary for reference
    const polygon = ${polygonGeoJSON};
    const polygonLayer = L.geoJSON(polygon, {
      style: {
        fill: false,
        color: '#FF0000',
        weight: 2,
        opacity: 0.6
      }
    }).addTo(map);

    // Fit to exact bounds
    map.fitBounds([[${minLat}, ${minLng}], [${maxLat}, ${maxLng}]], {
      padding: [0, 0]
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

  // Wait longer for tiles to fully load
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Take screenshot
  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${area.id}.png`);

  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: 0,
      y: 0,
      width: 2048,
      height: 2048
    }
  });

  console.log(`  ✓ Saved: ${area.id}.png (2048x2048 full map)`);

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
  console.log('Capturing full rectangular 2D map views for planning areas...\n');

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
  console.log('\n✅ Done! All area maps captured as full rectangular textures.');
}

main().catch(console.error);
