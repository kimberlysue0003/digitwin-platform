// Import all building data, map textures, and metadata to database
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface BuildingData {
  planningArea: string;
  id: string;
  buildingCount: number;
  buildings: Array<{
    footprint: [number, number][];
    height: number;
  }>;
}

interface MapMetadata {
  bounds: [[number, number], [number, number]];
  center: [number, number];
  zoom: number;
  size: [number, number];
  name: string;
  region: string;
  geometry: any;
}

async function importPlanningAreas() {
  console.log('\n📍 Importing Planning Areas...');

  const frontendPath = path.join(__dirname, '../../digitwin-frontend/public');
  const mapTexturesPath = path.join(frontendPath, 'map-textures');

  const jsonFiles = fs.readdirSync(mapTexturesPath).filter(f => f.endsWith('.json'));

  let imported = 0;
  let skipped = 0;

  for (const file of jsonFiles) {
    const areaId = file.replace('.json', '');
    const metadata: MapMetadata = JSON.parse(
      fs.readFileSync(path.join(mapTexturesPath, file), 'utf-8')
    );

    const [[minLat, minLng], [maxLat, maxLng]] = metadata.bounds;
    const [centerLat, centerLng] = metadata.center;

    try {
      await prisma.planningArea.upsert({
        where: { id: areaId },
        update: {
          name: metadata.name,
          region: metadata.region.toLowerCase(),
          centerLat,
          centerLng,
          boundsMinLat: minLat,
          boundsMinLng: minLng,
          boundsMaxLat: maxLat,
          boundsMaxLng: maxLng,
        },
        create: {
          id: areaId,
          name: metadata.name,
          region: metadata.region.toLowerCase(),
          centerLat,
          centerLng,
          boundsMinLat: minLat,
          boundsMinLng: minLng,
          boundsMaxLat: maxLat,
          boundsMaxLng: maxLng,
        },
      });
      imported++;
    } catch (error) {
      console.error(`Failed to import ${areaId}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Imported ${imported} planning areas (${skipped} skipped)`);
}

async function importMapTextures() {
  console.log('\n🗺️  Importing Map Textures...');

  const frontendPath = path.join(__dirname, '../../digitwin-frontend/public');
  const mapTexturesPath = path.join(frontendPath, 'map-textures');

  const jsonFiles = fs.readdirSync(mapTexturesPath).filter(f => f.endsWith('.json'));

  let imported = 0;
  let skipped = 0;

  for (const file of jsonFiles) {
    const areaId = file.replace('.json', '');
    const pngFile = `${areaId}.png`;
    const pngPath = path.join(mapTexturesPath, pngFile);

    // Check if PNG exists
    if (!fs.existsSync(pngPath)) {
      console.warn(`⚠️  PNG not found for ${areaId}`);
      skipped++;
      continue;
    }

    const metadata: MapMetadata = JSON.parse(
      fs.readFileSync(path.join(mapTexturesPath, file), 'utf-8')
    );

    const [[minLat, minLng], [maxLat, maxLng]] = metadata.bounds;
    const [centerLat, centerLng] = metadata.center;
    const [width, height] = metadata.size;

    try {
      await prisma.mapTexture.upsert({
        where: { planningAreaId: areaId },
        update: {
          pngFilePath: `map-textures/${pngFile}`,
          boundsMinLat: minLat,
          boundsMinLng: minLng,
          boundsMaxLat: maxLat,
          boundsMaxLng: maxLng,
          centerLat,
          centerLng,
          zoom: metadata.zoom,
          width,
          height,
        },
        create: {
          planningAreaId: areaId,
          pngFilePath: `map-textures/${pngFile}`,
          boundsMinLat: minLat,
          boundsMinLng: minLng,
          boundsMaxLat: maxLat,
          boundsMaxLng: maxLng,
          centerLat,
          centerLng,
          zoom: metadata.zoom,
          width,
          height,
        },
      });
      imported++;
    } catch (error) {
      console.error(`Failed to import map texture for ${areaId}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Imported ${imported} map textures (${skipped} skipped)`);
}

async function importBuildings() {
  console.log('\n🏢 Importing Buildings...');

  const frontendPath = path.join(__dirname, '../../digitwin-frontend/public');
  const buildingsPath = path.join(frontendPath, 'buildings');

  const jsonFiles = fs.readdirSync(buildingsPath).filter(f => f.endsWith('.json'));

  let totalBuildings = 0;
  let importedAreas = 0;

  for (const file of jsonFiles) {
    const areaId = file.replace('.json', '');
    const buildingData: BuildingData = JSON.parse(
      fs.readFileSync(path.join(buildingsPath, file), 'utf-8')
    );

    console.log(`  Processing ${areaId}: ${buildingData.buildingCount} buildings...`);

    try {
      // Delete existing buildings for this area
      await prisma.building.deleteMany({
        where: { planningAreaId: areaId },
      });

      // Batch insert buildings (in chunks to avoid memory issues)
      const chunkSize = 500;
      for (let i = 0; i < buildingData.buildings.length; i += chunkSize) {
        const chunk = buildingData.buildings.slice(i, i + chunkSize);

        await prisma.building.createMany({
          data: chunk.map(building => ({
            planningAreaId: areaId,
            footprint: building.footprint as any,
            height: building.height,
            fetchedAt: new Date(),
          })),
        });
      }

      totalBuildings += buildingData.buildingCount;
      importedAreas++;
    } catch (error) {
      console.error(`Failed to import buildings for ${areaId}:`, error);
    }
  }

  console.log(`✅ Imported ${totalBuildings} buildings from ${importedAreas} areas`);
}

async function main() {
  console.log('\n🚀 Starting Data Import to Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await importPlanningAreas();
    await importMapTextures();
    await importBuildings();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Data import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
