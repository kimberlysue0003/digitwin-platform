// Export data from Node.js backend to JSON files
// Run this script in the digitwin-backend directory
const fs = require('fs');
const path = require('path');

// Mock data generator - replace with actual database queries
function generateMockAreas() {
  const regions = ['central', 'north', 'south', 'east', 'west'];
  const areas = [];

  for (let i = 0; i < 55; i++) {
    areas.push({
      id: `area-${String.fromCharCode(97 + Math.floor(i / 5))}-${i % 5 + 1}`,
      name: `Planning Area ${i + 1}`,
      region: regions[Math.floor(Math.random() * regions.length)],
      boundsMinLat: 1.2 + Math.random() * 0.2,
      boundsMaxLat: 1.4 + Math.random() * 0.2,
      boundsMinLng: 103.6 + Math.random() * 0.3,
      boundsMaxLng: 103.9 + Math.random() * 0.3,
    });
  }

  return areas;
}

function generateMockBuildings(areas) {
  const buildingTypes = ['residential', 'commercial', 'industrial', 'mixed'];
  const buildings = [];

  areas.forEach(area => {
    const buildingCount = Math.floor(Math.random() * 200) + 50;

    for (let i = 0; i < buildingCount; i++) {
      buildings.push({
        planningAreaId: area.id,
        footprint: [
          { x: Math.random() * 100, y: Math.random() * 100 },
          { x: Math.random() * 100, y: Math.random() * 100 },
          { x: Math.random() * 100, y: Math.random() * 100 },
          { x: Math.random() * 100, y: Math.random() * 100 },
        ],
        height: Math.random() * 200 + 10,
        buildingType: buildingTypes[Math.floor(Math.random() * buildingTypes.length)],
        yearBuilt: 1950 + Math.floor(Math.random() * 74),
      });
    }
  });

  return buildings;
}

function generateMockStreamlines(areas) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const streamlines = [];

  areas.forEach(area => {
    directions.forEach(direction => {
      const lineCount = Math.floor(Math.random() * 10) + 5;

      for (let i = 0; i < lineCount; i++) {
        const points = [];
        const pointCount = Math.floor(Math.random() * 50) + 20;

        for (let j = 0; j < pointCount; j++) {
          points.push({
            x: Math.random() * 100,
            y: Math.random() * 100,
            z: Math.random() * 50,
          });
        }

        streamlines.push({
          planningAreaId: area.id,
          direction: direction,
          points: points,
        });
      }
    });
  });

  return streamlines;
}

function generateMockMapTextures(areas) {
  return areas.slice(0, 10).map(area => ({
    planningAreaId: area.id,
    pngFilePath: `textures/${area.id}.png`,
    boundsMinLat: area.boundsMinLat,
    boundsMaxLat: area.boundsMaxLat,
    boundsMinLng: area.boundsMinLng,
    boundsMaxLng: area.boundsMaxLng,
  }));
}

async function exportData() {
  console.log('🚀 Exporting data from Node.js backend...\n');

  const outputDir = path.join(__dirname, '../data');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate and export areas
  console.log('📍 Exporting planning areas...');
  const areas = generateMockAreas();
  fs.writeFileSync(
    path.join(outputDir, 'areas.json'),
    JSON.stringify(areas, null, 2)
  );
  console.log(`✅ Exported ${areas.length} areas\n`);

  // Generate and export buildings
  console.log('🏢 Exporting buildings...');
  const buildings = generateMockBuildings(areas);
  fs.writeFileSync(
    path.join(outputDir, 'buildings.json'),
    JSON.stringify(buildings, null, 2)
  );
  console.log(`✅ Exported ${buildings.length} buildings\n`);

  // Generate and export streamlines
  console.log('💨 Exporting wind streamlines...');
  const streamlines = generateMockStreamlines(areas);
  fs.writeFileSync(
    path.join(outputDir, 'streamlines.json'),
    JSON.stringify(streamlines, null, 2)
  );
  console.log(`✅ Exported ${streamlines.length} streamlines\n`);

  // Generate and export map textures
  console.log('🗺️  Exporting map textures...');
  const mapTextures = generateMockMapTextures(areas);
  fs.writeFileSync(
    path.join(outputDir, 'map_textures.json'),
    JSON.stringify(mapTextures, null, 2)
  );
  console.log(`✅ Exported ${mapTextures.length} map textures\n`);

  console.log('✅ All data exported successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
}

exportData().catch(console.error);
