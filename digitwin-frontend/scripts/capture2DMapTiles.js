// Capture 2D map view for each planning area and save as texture
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Planning areas to capture (add more as needed)
const PLANNING_AREAS = [
  { id: 'downtown-core', name: 'Downtown Core', bounds: [[1.2650, 103.8350], [1.2950, 103.8650]] },
  { id: 'marina-south', name: 'Marina South', bounds: [[1.2500, 103.8500], [1.2800, 103.8800]] },
  { id: 'museum', name: 'Museum', bounds: [[1.2920, 103.8480], [1.3020, 103.8620]] },
  { id: 'newton', name: 'Newton', bounds: [[1.3050, 103.8300], [1.3180, 103.8450]] },
  { id: 'orchard', name: 'Orchard', bounds: [[1.2950, 103.8250], [1.3100, 103.8450]] },
];

// Capture map for a specific area
async function captureAreaMap(page, area) {
  console.log(`\nCapturing ${area.name}...`);

  const [[minLat, minLng], [maxLat, maxLng]] = area.bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Calculate appropriate zoom level based on bounds
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  // Zoom level calculation (empirical formula for Leaflet)
  let zoom = 15;
  if (maxDiff > 0.05) zoom = 13;
  else if (maxDiff > 0.03) zoom = 14;
  else if (maxDiff > 0.02) zoom = 15;
  else zoom = 16;

  console.log(`  Center: [${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}], Zoom: ${zoom}`);

  // Create a simple HTML page with Leaflet map
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
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
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
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Wait for tiles to load
  await page.waitForFunction(() => window.mapReady === true, { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 5000)); // Extra time for all tiles

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

  console.log(`  ✓ Saved: ${area.id}.png (2048x2048)`);

  // Save metadata
  const metadata = {
    id: area.id,
    name: area.name,
    bounds: area.bounds,
    center: [centerLat, centerLng],
    zoom: zoom,
    size: [2048, 2048]
  };

  const metadataPath = path.join(outputDir, `${area.id}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return true;
}

// Main execution
async function main() {
  console.log('Capturing 2D map views for planning areas...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2048, height: 2048 });

  for (const area of PLANNING_AREAS) {
    try {
      await captureAreaMap(page, area);
    } catch (error) {
      console.error(`Error capturing ${area.name}:`, error.message);
    }
  }

  await browser.close();
  console.log('\n✅ Done!');
}

main().catch(console.error);
