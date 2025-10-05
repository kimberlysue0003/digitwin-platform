// Batch generate ground map textures for all planning areas using Puppeteer
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load areas to process
const areasToProcess = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'areasToProcess.json'), 'utf-8')
);

// Planning areas with bounds
const planningAreasPath = path.join(__dirname, '../src/data/planningAreas.ts');
const planningAreasContent = fs.readFileSync(planningAreasPath, 'utf-8');

// Parse planning area bounds from TypeScript file
function parsePlanningAreas() {
  const areas = [];
  const regex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',.*?bounds:\s*\[\[([0-9.]+),\s*([0-9.]+)\],\s*\[([0-9.]+),\s*([0-9.]+)\]\]/gs;

  let match;
  while ((match = regex.exec(planningAreasContent)) !== null) {
    const [, id, name, minLat, minLng, maxLat, maxLng] = match;
    areas.push({
      id,
      name,
      bounds: [[parseFloat(minLat), parseFloat(minLng)], [parseFloat(maxLat), parseFloat(maxLng)]]
    });
  }

  return areas;
}

const PLANNING_AREAS = parsePlanningAreas();

// Capture map for a single area
async function captureAreaMap(browser, areaId) {
  const areaData = PLANNING_AREAS.find(a => a.id === areaId);
  if (!areaData) {
    throw new Error(`No area data found for ${areaId}`);
  }

  const [[minLat, minLng], [maxLat, maxLng]] = areaData.bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

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
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false
    });

    let tilesLoaded = 0;

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 10
    });

    tileLayer.on('load', () => {
      window.allTilesLoaded = true;
    });

    tileLayer.addTo(map);

    map.fitBounds([[${minLat}, ${minLng}], [${maxLat}, ${maxLng}]], {
      padding: [0, 0]
    });

    window.mapReady = true;
  </script>
</body>
</html>
  `;

  const page = await browser.newPage();

  await page.setViewport({ width: 2048, height: 2048 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 10000 });

  try {
    await page.waitForFunction(() => window.allTilesLoaded === true, { timeout: 20000 });
  } catch (e) {
    // Continue anyway if timeout
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${areaId}.png`);

  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: 0,
      y: 0,
      width: 2048,
      height: 2048
    }
  });

  // Save metadata
  const metadata = {
    id: areaId,
    name: areaData.name,
    bounds: [[minLat, minLng], [maxLat, maxLng]],
    center: [centerLat, centerLng],
    zoom: 14,
    size: [2048, 2048]
  };

  const metadataPath = path.join(outputDir, `${areaId}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  await page.close();

  return {
    imageSize: (fs.statSync(screenshotPath).size / 1024).toFixed(1)
  };
}

// Main batch processing
async function main() {
  console.log(`\n🗺️  Batch Generating Ground Map Textures`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total areas to process: ${areasToProcess.length}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < areasToProcess.length; i++) {
    const areaId = areasToProcess[i];

    console.log(`\n📸 [${i + 1}/${areasToProcess.length}] ${areaId}`);

    try {
      const result = await captureAreaMap(browser, areaId);
      console.log(`   ✅ Saved ${areaId}.png (${result.imageSize} KB)`);
      successCount++;

      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  await browser.close();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Batch Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
}

main().catch(console.error);
