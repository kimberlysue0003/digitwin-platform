// Master script to process all areas in sequence
// 1. Fetch real building data from OpenStreetMap
// 2. Generate wind streamlines based on buildings
// 3. Generate ground map textures

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runStep(stepName, command) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Step: ${stepName}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ ${stepName} completed in ${duration} minutes`);

    return true;
  } catch (error) {
    console.error(`\n❌ ${stepName} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     Singapore Urban Digital Twin - Data Processing          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

This will process all 54 planning areas (excluding choa-chu-kang):

  1. Fetch real building data from OpenStreetMap (~30-50 min)
  2. Generate wind streamlines with collision avoidance (~60-90 min)
  3. Generate ground map textures (~15-20 min)

Total estimated time: 2-3 hours
`);

  const startTime = Date.now();

  // Check if areasToProcess.json exists
  const areasFile = path.join(__dirname, 'areasToProcess.json');
  if (!fs.existsSync(areasFile)) {
    console.log('📋 Generating area list...');
    await runStep('Generate Area List', 'node scripts/processAllAreas.js');
  }

  // Step 1: Fetch buildings
  const step1 = await runStep(
    'Step 1: Fetch Real Building Data',
    'node scripts/batchFetchRealBuildings.js'
  );

  if (!step1) {
    console.log('\n⚠️  Step 1 failed. Continuing with available building data...');
  }

  // Step 2: Generate streamlines
  const step2 = await runStep(
    'Step 2: Generate Wind Streamlines',
    'node scripts/batchGenerateWindStreamlines.js'
  );

  if (!step2) {
    console.log('\n❌ Step 2 failed. Cannot continue without streamlines.');
    process.exit(1);
  }

  // Step 3: Generate ground maps
  const step3 = await runStep(
    'Step 3: Generate Ground Map Textures',
    'node scripts/batchGenerateGroundMaps.js'
  );

  if (!step3) {
    console.log('\n⚠️  Step 3 failed. Some areas may not have ground textures.');
  }

  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`
${'='.repeat(60)}
✅ ALL PROCESSING COMPLETE!
${'='.repeat(60)}

Total time: ${totalDuration} minutes

Generated files:
  - public/buildings/*.json (building data)
  - public/streamlines/*.json (wind flow data)
  - public/map-textures/*.png (ground textures)

Next steps:
  1. Commit and push changes to repository
  2. Deploy frontend to production
  3. Backend already uses static data files (no changes needed)
`);
}

main().catch(console.error);
