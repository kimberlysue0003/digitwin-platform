// Generate polygon-clipped ground map textures using SVG masking
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

// Generate map texture with SVG mask
async function generatePolygonTexture(browser, areaId) {
  const areaData = getPlanningAreaData(areaId);
  if (!areaData) {
    throw new Error(`No area data found for ${areaId}`);
  }

  const [[minLat, minLng], [maxLat, maxLng]] = areaData.bounds;

  // Convert geometry to SVG polygon path - normalized to 0-2048 pixel space
  const polygonPoints = areaData.geometry.coordinates[0].map(([lng, lat]) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 2048;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 2048; // Flip Y
    return `${x},${y}`;
  }).join(' ');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    #container { position: relative; width: 2048px; height: 2048px; }
    #map { width: 2048px; height: 2048px; }
    #mask { position: absolute; top: 0; left: 0; pointer-events: none; }
    .leaflet-container { background: transparent !important; }
  </style>
</head>
<body>
  <div id="container">
    <div id="map"></div>
    <svg id="mask" width="2048" height="2048">
      <defs>
        <mask id="polygon-mask">
          <rect width="2048" height="2048" fill="black"/>
          <polygon points="${polygonPoints}" fill="white"/>
        </mask>
      </defs>
      <rect width="2048" height="2048" fill="transparent" mask="url(#polygon-mask)"/>
    </svg>
  </div>
  <script>
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
        // Apply mask to map container
        const mapDiv = document.getElementById('map');
        mapDiv.style.maskImage = 'url(#polygon-mask)';
        mapDiv.style.webkitMaskImage = 'url(#polygon-mask)';

        window.renderComplete = true;
      }, 1000);
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
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for map and tiles
  try {
    await page.waitForFunction(() => window.mapReady === true, { timeout: 3000 });
  } catch (e) {
    // Continue anyway
  }
  await new Promise(resolve => setTimeout(resolve, 10000)); // Long wait for tiles

  const outputDir = path.join(__dirname, '../public/map-textures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, `${areaId}.png`);

  // Screenshot the entire container
  await page.screenshot({
    path: screenshotPath,
    clip: { x: 0, y: 0, width: 2048, height: 2048 },
    omitBackground: true  // Transparent background
  });

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
    console.log('Usage: node generatePolygonTexturesV2.js <area-id-1> <area-id-2> ...');
    console.log('Example: node generatePolygonTexturesV2.js jurong-east tuas');
    process.exit(1);
  }

  console.log(`\n🗺️  Generating Polygon-Clipped Map Textures (V2 - SVG Mask)`);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
