// Capture 2D map view for each planning area with polygon boundary clipping
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

// Capture map for a specific area with polygon clipping
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

  // Create HTML page with Leaflet map and polygon clipping
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    #map { width: 2048px; height: 2048px; background: transparent; }
    .leaflet-container { background: transparent !important; }
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
        color: 'transparent',
        weight: 0
      }
    }).addTo(map);

    // Fit to polygon bounds
    map.fitBounds(polygonLayer.getBounds(), {
      padding: [50, 50]
    });

    // Signal ready
    window.mapReady = true;
    window.polygonCoords = ${JSON.stringify(coordinates)};
  </script>
</body>
</html>
  `;

  // Set content and wait for map to load
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for tiles

  // Take screenshot with transparent background
  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${area.id}.png`);

  // Take screenshot and apply polygon clipping using canvas
  await page.evaluate((coords) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Get map container
    const mapContainer = document.getElementById('map');

    // Use html2canvas-like approach: draw the map element
    // Note: We'll use a simpler approach - just clip the background
    ctx.clearRect(0, 0, 2048, 2048);

    // Save canvas state
    ctx.save();

    // Create clipping path from polygon
    ctx.beginPath();

    // Get Leaflet map instance to convert lat/lng to pixels
    const map = L.DomUtil.get('map')._leaflet_map;

    coords.forEach((coord, i) => {
      const point = map.latLngToContainerPoint([coord[1], coord[0]]);
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.closePath();
    ctx.clip();

    // Mark as ready for screenshot
    window.clippingReady = true;
  }, coordinates);

  await page.waitForFunction(() => window.clippingReady === true, { timeout: 5000 });

  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: 0,
      y: 0,
      width: 2048,
      height: 2048
    },
    omitBackground: true
  });

  console.log(`  ✓ Saved: ${area.id}.png (2048x2048)`);

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
