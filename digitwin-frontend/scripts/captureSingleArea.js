// Capture single area map - choa-chu-kang
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Choa Chu Kang area info
const area = {
  id: 'choa-chu-kang',
  name: 'CHOA CHU KANG',
  bounds: [1.3691, 103.7327, 1.4055, 103.7612]
};

async function captureMap() {
  console.log(`Capturing ${area.name}...`);

  const [minLat, minLng, maxLat, maxLng] = area.bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  console.log(`  Center: [${centerLat}, ${centerLng}]`);
  console.log(`  Bounds: [${minLat}, ${minLng}] to [${maxLat}, ${maxLng}]`);

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
    .leaflet-container { background: #f0f0f0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    console.log('Initializing map...');

    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false
    });

    let tilesLoaded = 0;
    let tilesTotal = 0;

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 10
    });

    tileLayer.on('loading', () => {
      console.log('Tiles loading started...');
      tilesTotal = 0;
      tilesLoaded = 0;
    });

    tileLayer.on('tileload', () => {
      tilesLoaded++;
      console.log('Tile loaded:', tilesLoaded);
    });

    tileLayer.on('load', () => {
      console.log('All tiles loaded!');
      window.allTilesLoaded = true;
    });

    tileLayer.addTo(map);

    // Fit to bounds
    map.fitBounds([[${minLat}, ${minLng}], [${maxLat}, ${maxLng}]], {
      padding: [0, 0]
    });

    console.log('Map center:', map.getCenter());
    console.log('Map zoom:', map.getZoom());

    window.mapReady = true;
  </script>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen to console logs from the page
  page.on('console', msg => console.log('  [Browser]:', msg.text()));

  await page.setViewport({ width: 2048, height: 2048 });

  console.log('  Loading HTML...');
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('  Waiting for map to initialize...');
  await page.waitForFunction(() => window.mapReady === true, { timeout: 10000 });

  console.log('  Waiting for tiles to load...');
  // Wait for tiles with timeout
  try {
    await page.waitForFunction(() => window.allTilesLoaded === true, { timeout: 20000 });
    console.log('  ✓ Tiles loaded');
  } catch (e) {
    console.log('  ⚠ Timeout waiting for tiles, continuing anyway...');
  }

  // Extra wait to be safe
  await new Promise(resolve => setTimeout(resolve, 3000));

  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${area.id}.png`);

  console.log('  Taking screenshot...');
  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: 0,
      y: 0,
      width: 2048,
      height: 2048
    }
  });

  console.log(`  ✓ Saved: ${area.id}.png`);

  // Save metadata
  const metadata = {
    id: area.id,
    name: area.name,
    bounds: [[minLat, minLng], [maxLat, maxLng]],
    center: [centerLat, centerLng],
    zoom: 14,
    size: [2048, 2048]
  };

  const metadataPath = path.join(outputDir, `${area.id}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  await browser.close();
  console.log('✅ Done!');
}

captureMap().catch(console.error);
