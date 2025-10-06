// Reusable module for capturing 2D maps with polygon clipping
import puppeteer from 'puppeteer';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

/**
 * Capture a 2D map with polygon clipping
 * @param {Object} options Configuration options
 * @param {string} options.areaId Planning area ID
 * @param {Array} options.bounds [[minLat, minLng], [maxLat, maxLng]]
 * @param {Object} options.geometry GeoJSON geometry object
 * @param {string} options.outputDir Output directory for map images
 * @param {string} options.metadataDir Output directory for metadata JSON
 * @param {number} options.zoom Leaflet zoom level (default: 15)
 * @param {number} options.size Image size in pixels (default: 2048)
 * @returns {Promise<Object>} Capture result with actualBounds and file info
 */
export async function captureMapWithClipping(options) {
  const {
    areaId,
    bounds,
    geometry,
    outputDir,
    metadataDir,
    zoom = 15,
    size = 2048
  } = options;

  const [[minLat, minLng], [maxLat, maxLng]] = bounds;

  // Create temporary HTML file
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body { margin: 0; padding: 0; }
    #map { width: ${size}px; height: ${size}px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const bounds = L.latLngBounds(
      L.latLng(${minLat}, ${minLng}),
      L.latLng(${maxLat}, ${maxLng})
    );

    map.fitBounds(bounds);
    map.setZoom(${zoom});

    setTimeout(() => {
      const actualBounds = map.getBounds();
      window.actualBounds = {
        south: actualBounds.getSouth(),
        north: actualBounds.getNorth(),
        west: actualBounds.getWest(),
        east: actualBounds.getEast()
      };
      window.mapReady = true;
    }, 1000);
  </script>
</body>
</html>`;

  const tempDir = path.join(process.cwd(), '.temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempHtmlPath = path.join(tempDir, `${areaId}-map.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size });
  await page.goto(`file://${tempHtmlPath}`);
  await page.waitForFunction('window.mapReady === true', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const actualBounds = await page.evaluate(() => window.actualBounds);
  const screenshotBuffer = await page.screenshot({ type: 'png' });

  await browser.close();
  fs.unlinkSync(tempHtmlPath);

  // Apply polygon clipping
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(screenshotBuffer);

  // Convert geometry to screen coordinates
  const latToY = (lat) => {
    const latRange = actualBounds.north - actualBounds.south;
    return size - ((lat - actualBounds.south) / latRange) * size;
  };

  const lngToX = (lng) => {
    const lngRange = actualBounds.east - actualBounds.west;
    return ((lng - actualBounds.west) / lngRange) * size;
  };

  let polygonScreenCoords = [];
  if (geometry.type === 'Polygon') {
    polygonScreenCoords = geometry.coordinates[0].map(([lng, lat]) => [lngToX(lng), latToY(lat)]);
  } else if (geometry.type === 'MultiPolygon') {
    polygonScreenCoords = geometry.coordinates[0][0].map(([lng, lat]) => [lngToX(lng), latToY(lat)]);
  }

  // Clip to polygon
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  polygonScreenCoords.forEach((coord, i) => {
    if (i === 0) ctx.moveTo(coord[0], coord[1]);
    else ctx.lineTo(coord[0], coord[1]);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);

  // Save clipped image
  const pngBuffer = canvas.toBuffer('image/png');
  const pngPath = path.join(outputDir, `${areaId}.png`);
  fs.writeFileSync(pngPath, pngBuffer);

  // Save metadata
  const metadata = {
    id: areaId,
    name: areaId.toUpperCase().replace(/-/g, ' '),
    bounds: [
      [actualBounds.south, actualBounds.west],
      [actualBounds.north, actualBounds.east]
    ],
    center: [
      (actualBounds.south + actualBounds.north) / 2,
      (actualBounds.west + actualBounds.east) / 2
    ],
    zoom,
    size: [size, size],
    geometry,
    originalBounds: bounds
  };

  const metadataPath = path.join(metadataDir, `${areaId}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return {
    areaId,
    actualBounds,
    pngPath,
    metadataPath,
    fileSize: (pngBuffer.length / 1024).toFixed(1) + ' KB'
  };
}
