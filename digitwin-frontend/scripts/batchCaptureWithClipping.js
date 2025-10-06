// Batch capture planning areas with precise polygon clipping (like choa-chu-kang)
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

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

  const areaName = parseAreaFromDescription(feature.properties.Description);
  const regionName = parseRegionFromDescription(feature.properties.Description);

  return {
    id: areaId,
    name: areaName,
    region: regionName,
    geometry: feature.geometry
  };
}

// Capture single area with clipping
async function captureAreaWithClipping(browser, areaId) {
  const area = getPlanningAreaData(areaId);
  if (!area) {
    throw new Error(`Area not found: ${areaId}`);
  }

  const geometry = area.geometry;

  // Handle both Polygon and MultiPolygon
  let allCoordinates = [];
  if (geometry.type === 'Polygon') {
    allCoordinates = [geometry.coordinates[0]];
  } else if (geometry.type === 'MultiPolygon') {
    allCoordinates = geometry.coordinates.map(poly => poly[0]);
  }

  // Calculate bounds from all polygons
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  allCoordinates.forEach(coords => {
    coords.forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
  });

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
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 10
    });

    tileLayer.on('load', () => {
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

    // Get actual map bounds after fitBounds
    const actualBounds = map.getBounds();
    window.actualBounds = {
      south: actualBounds.getSouth(),
      north: actualBounds.getNorth(),
      west: actualBounds.getWest(),
      east: actualBounds.getEast()
    };
    window.actualCenter = map.getCenter();
    window.actualZoom = map.getZoom();

    // Store polygon screen coordinates (handle MultiPolygon)
    window.polygonScreenCoords = [];
    if (polygon.geometry.type === 'Polygon') {
      polygon.geometry.coordinates[0].forEach(coord => {
        const point = map.latLngToContainerPoint([coord[1], coord[0]]);
        window.polygonScreenCoords.push([point.x, point.y]);
      });
    } else if (polygon.geometry.type === 'MultiPolygon') {
      // For MultiPolygon, store all polygons
      window.allPolygons = [];
      polygon.geometry.coordinates.forEach(poly => {
        const coords = [];
        poly[0].forEach(coord => {
          const point = map.latLngToContainerPoint([coord[1], coord[0]]);
          coords.push([point.x, point.y]);
        });
        window.allPolygons.push(coords);
      });
    }

    window.mapReady = true;
  </script>
</body>
</html>
  `;

  const page = await browser.newPage();
  await page.setViewport({ width: 2048, height: 2048 });

  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.mapReady === true, { timeout: 30000 });

  // Wait for tiles
  try {
    await page.waitForFunction(() => window.allTilesLoaded === true, { timeout: 20000 });
  } catch (e) {
    // Continue anyway
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get polygon coordinates and actual map bounds
  const polygonScreenCoords = await page.evaluate(() => window.polygonScreenCoords);
  const allPolygons = await page.evaluate(() => window.allPolygons);
  const actualBounds = await page.evaluate(() => window.actualBounds);
  const actualCenter = await page.evaluate(() => window.actualCenter);
  const actualZoom = await page.evaluate(() => window.actualZoom);

  // Take screenshot
  const outputDir = path.join(__dirname, '../public/map-textures');
  const tempPath = path.join(outputDir, `temp-${areaId}.png`);

  await page.screenshot({
    path: tempPath,
    clip: { x: 0, y: 0, width: 2048, height: 2048 }
  });

  await page.close();

  // Apply clipping with node-canvas
  const img = await loadImage(tempPath);
  const canvas = createCanvas(2048, 2048);
  const ctx = canvas.getContext('2d');

  // Clear to transparent
  ctx.clearRect(0, 0, 2048, 2048);

  // Create clipping path - handle both Polygon and MultiPolygon
  ctx.save();
  ctx.beginPath();

  if (polygonScreenCoords && polygonScreenCoords.length > 0) {
    // Single polygon
    polygonScreenCoords.forEach((coord, i) => {
      if (i === 0) {
        ctx.moveTo(coord[0], coord[1]);
      } else {
        ctx.lineTo(coord[0], coord[1]);
      }
    });
    ctx.closePath();
  } else if (allPolygons && allPolygons.length > 0) {
    // MultiPolygon - combine all polygons
    allPolygons.forEach(coords => {
      coords.forEach((coord, i) => {
        if (i === 0) {
          ctx.moveTo(coord[0], coord[1]);
        } else {
          ctx.lineTo(coord[0], coord[1]);
        }
      });
      ctx.closePath();
    });
  }

  ctx.clip();

  // Draw image only within polygon(s)
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Save final PNG
  const finalPath = path.join(outputDir, `${area.id}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(finalPath, buffer);
  fs.unlinkSync(tempPath);

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

  return {
    imageSize: (fs.statSync(finalPath).size / 1024 / 1024).toFixed(2)
  };
}

// Main batch processing
async function main() {
  const areasToProcess = process.argv.slice(2);

  if (areasToProcess.length === 0) {
    console.log('Usage: node batchCaptureWithClipping.js <area-id-1> <area-id-2> ...');
    console.log('Example: node batchCaptureWithClipping.js boon-lay jurong-east');
    process.exit(1);
  }

  console.log(`\n🗺️  Batch Capturing with Polygon Clipping (Choa Chu Kang Method)`);
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
      const result = await captureAreaWithClipping(browser, areaId);
      console.log(`   ✅ Saved ${areaId}.png (${result.imageSize} MB)`);
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
