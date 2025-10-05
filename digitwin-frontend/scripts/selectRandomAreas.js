// Select 8 random planning areas from GeoJSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read GeoJSON
const geojsonPath = path.join(__dirname, '../public/data/MasterPlan2019PlanningAreaBoundaryNoSea.geojson');
const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

console.log(`Total areas in GeoJSON: ${geojson.features.length}`);

// Randomly select 8 areas
const shuffled = [...geojson.features].sort(() => Math.random() - 0.5);
const selected = shuffled.slice(0, 8);

// Extract area info
const selectedAreas = selected.map(feature => {
  const geometry = feature.geometry;

  // Extract name from Description HTML
  const desc = feature.properties.Description || '';
  const nameMatch = desc.match(/<th>PLN_AREA_N<\/th>\s*<td>([^<]+)<\/td>/);
  const regionMatch = desc.match(/<th>REGION_N<\/th>\s*<td>([^<]+)<\/td>/);

  const areaName = nameMatch ? nameMatch[1] : 'Unknown';
  const regionName = regionMatch ? regionMatch[1] : 'Unknown';
  const areaId = areaName.toLowerCase().replace(/\s+/g, '-');

  return {
    id: areaId,
    name: areaName,
    region: regionName,
    geometry: geometry
  };
});

console.log('\nSelected 8 random areas:');
selectedAreas.forEach((area, i) => {
  console.log(`${i + 1}. ${area.name} (${area.id})`);
});

// Save to file
const outputPath = path.join(__dirname, 'selectedAreas.json');
fs.writeFileSync(outputPath, JSON.stringify(selectedAreas, null, 2));

console.log(`\n✓ Saved to ${outputPath}`);
