// Capture Choa Chu Kang with precise polygon clipping
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load area data
const selectedAreasPath = path.join(__dirname, 'selectedAreas.json');
const selectedAreas = JSON.parse(fs.readFileSync(selectedAreasPath, 'utf-8'));
const area = selectedAreas.find(a => a.id === 'choa-chu-kang');

if (!area) {
  console.error('Choa Chu Kang not found!');
  process.exit(1);
}

async function captureWithClipping() {
  console.log(`\nCapturing ${area.name} with polygon clipping...`);

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

  console.log(`  Bounds: [${minLat}, ${minLng}] to [${maxLat}, ${maxLng}]`);

  const polygonGeoJSON = JSON.stringify({
    type: "Feature",
    geometry: geometry
  });

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
    console.log('Initializing map...');

    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 10
    });

    tileLayer.on('load', () => {
      console.log('All tiles loaded!');
      window.allTilesLoaded = true;
    });

    tileLayer.addTo(map);

    // Polygon
    const polygon = ${polygonGeoJSON};
    const polygonLayer = L.geoJSON(polygon, {
      style: { fill: false, color: 'transparent', weight: 0 }
    }).addTo(map);

    // Fit to bounds
    map.fitBounds([[${minLat}, ${minLng}], [${maxLat}, ${maxLng}]], { padding: [0, 0] });

    // Get actual map bounds after fitBounds (Leaflet may adjust them)
    const actualBounds = map.getBounds();
    window.actualBounds = {
      south: actualBounds.getSouth(),
      north: actualBounds.getNorth(),
      west: actualBounds.getWest(),
      east: actualBounds.getEast()
    };
    window.actualCenter = map.getCenter();
    window.actualZoom = map.getZoom();

    console.log('Actual bounds:', window.actualBounds);
    console.log('Actual center:', window.actualCenter);
    console.log('Actual zoom:', window.actualZoom);

    // Store polygon screen coordinates
    window.polygonScreenCoords = [];
    polygon.geometry.coordinates[0].forEach(coord => {
      const point = map.latLngToContainerPoint([coord[1], coord[0]]);
      window.polygonScreenCoords.push([point.x, point.y]);
    });

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
  page.on('console', msg => console.log('  [Browser]:', msg.text()));
  await page.setViewport({ width: 2048, height: 2048 });

  console.log('  Loading map...');
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 10000 });

  console.log('  Waiting for tiles...');
  try {
    await page.waitForFunction(() => window.allTilesLoaded === true, { timeout: 20000 });
  } catch (e) {
    console.log('  ⚠ Timeout, continuing...');
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get polygon coordinates and actual map bounds
  const polygonScreenCoords = await page.evaluate(() => window.polygonScreenCoords);
  const actualBounds = await page.evaluate(() => window.actualBounds);
  const actualCenter = await page.evaluate(() => window.actualCenter);
  const actualZoom = await page.evaluate(() => window.actualZoom);

  console.log(`  Actual map bounds: [${actualBounds.south}, ${actualBounds.west}] to [${actualBounds.north}, ${actualBounds.east}]`);
  console.log(`  Actual center: [${actualCenter.lat}, ${actualCenter.lng}]`);
  console.log(`  Actual zoom: ${actualZoom}`);

  // Take screenshot
  const tempPath = path.join(__dirname, '../public/map-textures', `temp.png`);
  const outputDir = path.join(__dirname, '../public/map-textures');

  await page.screenshot({
    path: tempPath,
    clip: { x: 0, y: 0, width: 2048, height: 2048 }
  });

  await browser.close();

  console.log('  Applying polygon clipping...');

  // Apply clipping
  const img = await loadImage(tempPath);
  const canvas = createCanvas(2048, 2048);
  const ctx = canvas.getContext('2d');

  // IMPORTANT: Clear to transparent
  ctx.clearRect(0, 0, 2048, 2048);

  // Create clipping path
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

  // Draw image only within polygon
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Save
  const finalPath = path.join(outputDir, `${area.id}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(finalPath, buffer);
  fs.unlinkSync(tempPath);

  console.log(`  ✓ Saved: ${area.id}.png (with polygon clipping)`);

  // Save metadata with ACTUAL bounds used by Leaflet
  const metadata = {
    id: area.id,
    name: area.name,
    region: area.region,
    bounds: [[actualBounds.south, actualBounds.west], [actualBounds.north, actualBounds.east]],
    center: [actualCenter.lat, actualCenter.lng],
    zoom: actualZoom,
    size: [2048, 2048],
    geometry: geometry,
    originalBounds: [[minLat, minLng], [maxLat, maxLng]]
  };

  fs.writeFileSync(path.join(outputDir, `${area.id}.json`), JSON.stringify(metadata, null, 2));

  console.log('✅ Done!');
}

captureWithClipping().catch(console.error);
