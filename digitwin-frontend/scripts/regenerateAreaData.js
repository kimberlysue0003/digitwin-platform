#!/usr/bin/env node
// Unified script to regenerate 2D maps and 3D building data for planning areas
import { captureMapWithClipping } from './lib/mapCaptureWithClipping.js';
import { fetchBuildingData, loadMapMetadata } from './lib/buildingDataFetcher.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLANNING_AREAS_PATH = path.join(__dirname, '../public/planning-areas.json');
const MAP_TEXTURES_DIR = path.join(__dirname, '../public/map-textures');
const BUILDINGS_DIR = path.join(__dirname, '../public/buildings');

async function regenerateAreaData(areaIds, options = {}) {
  const {
    regenerateMaps = true,
    regenerateBuildings = true,
    skipExisting = false
  } = options;

  // Load planning areas
  const planningAreas = JSON.parse(fs.readFileSync(PLANNING_AREAS_PATH, 'utf-8'));

  console.log(`\n🔄 Regenerating Area Data`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Areas to process: ${areaIds.length}`);
  console.log(`Regenerate maps: ${regenerateMaps ? '✓' : '✗'}`);
  console.log(`Regenerate buildings: ${regenerateBuildings ? '✓' : '✗'}`);
  console.log(`Skip existing: ${skipExisting ? '✓' : '✗'}\n`);

  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < areaIds.length; i++) {
    const areaId = areaIds[i];
    const area = planningAreas.find(a => a.id === areaId);

    if (!area) {
      console.log(`\n❌ [${i + 1}/${areaIds.length}] ${areaId} - Not found in planning areas`);
      results.failed.push({ areaId, error: 'Area not found' });
      continue;
    }

    console.log(`\n📍 [${i + 1}/${areaIds.length}] ${areaId.toUpperCase().replace(/-/g, ' ')}`);

    try {
      let mapResult = null;
      let buildingResult = null;

      // Step 1: Regenerate 2D map
      if (regenerateMaps) {
        const mapPath = path.join(MAP_TEXTURES_DIR, `${areaId}.png`);
        if (skipExisting && fs.existsSync(mapPath)) {
          console.log(`   ⏭️  Skipping map (already exists)`);
        } else {
          console.log(`   🗺️  Generating 2D map with clipping...`);
          mapResult = await captureMapWithClipping({
            areaId,
            bounds: area.bounds,
            geometry: area.geometry,
            outputDir: path.join(__dirname, '../public/map-textures'),
            metadataDir: MAP_TEXTURES_DIR
          });
          console.log(`      ✅ Map saved (${mapResult.fileSize})`);
        }
      }

      // Step 2: Regenerate building data
      if (regenerateBuildings) {
        const buildingsPath = path.join(BUILDINGS_DIR, `${areaId}.json`);
        if (skipExisting && fs.existsSync(buildingsPath)) {
          console.log(`   ⏭️  Skipping buildings (already exists)`);
        } else {
          console.log(`   🏢 Fetching 3D building data...`);

          // Load map metadata to get actualBounds
          const metadata = loadMapMetadata(path.join(MAP_TEXTURES_DIR, `${areaId}.json`));

          buildingResult = await fetchBuildingData({
            areaId,
            bounds: metadata.bounds,
            geometry: metadata.geometry,
            outputDir: BUILDINGS_DIR
          });
          console.log(`      ✅ Saved ${buildingResult.buildingCount} buildings`);
        }
      }

      results.success.push({
        areaId,
        map: mapResult,
        buildings: buildingResult
      });

      // Rate limiting for API calls
      if (regenerateBuildings && i < areaIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.failed.push({ areaId, error: error.message });
    }
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Summary:`);
  console.log(`   Success: ${results.success.length} areas`);
  console.log(`   Failed: ${results.failed.length} areas`);

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed areas:`);
    results.failed.forEach(({ areaId, error }) => {
      console.log(`   - ${areaId}: ${error}`);
    });
  }

  return results;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: node regenerateAreaData.js [options] <area-id-1> <area-id-2> ...

Options:
  --maps-only          Only regenerate 2D maps
  --buildings-only     Only regenerate building data
  --skip-existing      Skip areas that already have data
  --help               Show this help message

Examples:
  node regenerateAreaData.js ang-mo-kio bedok       # Regenerate both maps and buildings
  node regenerateAreaData.js --maps-only yishun     # Only regenerate map
  node regenerateAreaData.js --skip-existing all    # Regenerate all missing data
`);
    process.exit(0);
  }

  let options = {
    regenerateMaps: true,
    regenerateBuildings: true,
    skipExisting: false
  };

  let areaIds = [];

  for (const arg of args) {
    if (arg === '--maps-only') {
      options.regenerateMaps = true;
      options.regenerateBuildings = false;
    } else if (arg === '--buildings-only') {
      options.regenerateMaps = false;
      options.regenerateBuildings = true;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === 'all') {
      const planningAreas = JSON.parse(fs.readFileSync(PLANNING_AREAS_PATH, 'utf-8'));
      areaIds = planningAreas.map(a => a.id);
    } else if (!arg.startsWith('--')) {
      areaIds.push(arg);
    }
  }

  regenerateAreaData(areaIds, options)
    .then(results => {
      process.exit(results.failed.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

export { regenerateAreaData };
