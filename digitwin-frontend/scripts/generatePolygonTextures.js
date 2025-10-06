// Generate polygon-clipped ground map textures for planning areas
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load GeoJSON data
const geojsonPath = path.join(__dirname, '../public/data/MasterPlan2019PlanningAreaBoundaryNoSea.geojson');
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

// Parse area name from Description HTML
function parseAreaFromDescription(description) {
  const match = description.match(/<th>PLN_AREA_N<\/th> <td>([^<]+)<\/td>/);
  return match ? match[1] : null;
}

// Parse region from Description HTML
function parseRegionFromDescription(description) {
  const match = description.match(/<th>REGION_N<\/th> <td>([^<]+)<\/td>/);
  return match ? match[1] : null;
}

// Convert area name to ID format
function nameToId(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Get planning area data from GeoJSON
function getPlanningAreaData(areaId) {
  const feature = geojsonData.features.find(f => {
    const areaName = parseAreaFromDescription(f.properties.Description);
    return areaName && nameToId(areaName) === areaId;
  });

  if (!feature) return null;

  const coords = feature.geometry.coordinates[0];

  // Calculate bounds
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  coords.forEach(([lng, lat]) => {
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  });

  const areaName = parseAreaFromDescription(feature.properties.Description);
  const regionName = parseRegionFromDescription(feature.properties.Description);

  return {
    id: areaId,
    name: areaName,
    region: regionName,
    bounds: [[minLat, minLng], [maxLat, maxLng]],
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
    geometry: feature.geometry
  };
}

// Generate map texture with polygon clipping
async function generatePolygonTexture(browser, areaId) {
  const areaData = getPlanningAreaData(areaId);
  if (!areaData) {
    throw new Error(`No area data found for ${areaId}`);
  }

  const [[minLat, minLng], [maxLat, maxLng]] = areaData.bounds;
  const [centerLat, centerLng] = areaData.center;

  // Convert geometry coordinates to pixel space for clipping
  const polygonCoords = areaData.geometry.coordinates[0].map(([lng, lat]) => {
    // Normalize to 0-1 range within bounds
    const x = (lng - minLng) / (maxLng - minLng);
    const y = 1 - (lat - minLat) / (maxLat - minLat); // Flip Y for canvas
    return [x * 2048, y * 2048];
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
    #output { position: absolute; top: 0; left: 0; }
    .leaflet-container { background: transparent !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="output" width="2048" height="2048"></canvas>
  <script>
    const polygon = ${JSON.stringify(polygonCoords)};

    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 10
    });

    tileLayer.on('load', () => {
      setTimeout(() => {
        // Create clipped texture
        const mapDiv = document.getElementById('map');
        const canvas = document.getElementById('output');
        const ctx = canvas.getContext('2d');

        // Draw clipping path
        ctx.beginPath();
        polygon.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point[0], point[1]);
          else ctx.lineTo(point[0], point[1]);
        });
        ctx.closePath();
        ctx.clip();

        // Draw map onto clipped canvas
        ctx.drawImage(mapDiv.querySelector('.leaflet-proxy'), 0, 0, 2048, 2048);

        window.renderComplete = true;
      }, 500);
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
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 20000 });

  // Wait for tiles to load
  await new Promise(resolve => setTimeout(resolve, 5000));

  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${areaId}.png`);

  // Take screenshot of canvas with clipped polygon
  const canvasElement = await page.$('#output');
  await canvasElement.screenshot({ path: screenshotPath });

  // Save metadata with geometry
  const metadata = {
    id: areaId,
    name: areaData.name,
    region: areaData.region,
    bounds: areaData.bounds,
    center: areaData.center,
    zoom: 16,
    size: [2048, 2048],
    geometry: areaData.geometry,
    originalBounds: areaData.bounds
  };

  const metadataPath = path.join(outputDir, `${areaId}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  await page.close();

  return {
    imageSize: (fs.statSync(screenshotPath).size / 1024).toFixed(1)
  };
}

// Main function
async function main() {
  const areasToProcess = process.argv.slice(2);

  if (areasToProcess.length === 0) {
    console.log('Usage: node generatePolygonTextures.js <area-id-1> <area-id-2> ...');
    console.log('Example: node generatePolygonTextures.js boon-lay bukit-batok');
    process.exit(1);
  }

  console.log(`\n🗺️  Generating Polygon-Clipped Map Textures`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Areas to process: ${areasToProcess.length}\n`);

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
      const result = await generatePolygonTexture(browser, areaId);
      console.log(`   ✅ Saved ${areaId}.png (${result.imageSize} KB)`);
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  await browser.close();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Complete!`);
  console.log(`   Success: ${successCount} areas`);
  console.log(`   Failed: ${failCount} areas`);
}

main().catch(console.error);
