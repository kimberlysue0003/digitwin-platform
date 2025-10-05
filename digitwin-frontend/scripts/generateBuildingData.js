// Generate building data for all 55 planning areas
// This creates realistic building distributions based on planning area characteristics

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Planning areas data
const PLANNING_AREAS = [
  // Central Region
  { id: 'downtown-core', name: 'Downtown Core', region: 'central', center: [1.2806, 103.8507], bounds: [[1.2650, 103.8350], [1.2950, 103.8650]], density: 'high', avgHeight: 150 },
  { id: 'marina-south', name: 'Marina South', region: 'central', center: [1.2644, 103.8632], bounds: [[1.2500, 103.8500], [1.2800, 103.8800]], density: 'medium', avgHeight: 80 },
  { id: 'museum', name: 'Museum', region: 'central', center: [1.2967, 103.8489], bounds: [[1.2850, 103.8400], [1.3100, 103.8600]], density: 'medium', avgHeight: 60 },
  { id: 'newton', name: 'Newton', region: 'central', center: [1.3138, 103.8388], bounds: [[1.3050, 103.8300], [1.3250, 103.8500]], density: 'high', avgHeight: 100 },
  { id: 'orchard', name: 'Orchard', region: 'central', center: [1.3048, 103.8318], bounds: [[1.2950, 103.8200], [1.3150, 103.8450]], density: 'high', avgHeight: 120 },
  { id: 'outram', name: 'Outram', region: 'central', center: [1.2787, 103.8371], bounds: [[1.2700, 103.8250], [1.2900, 103.8500]], density: 'medium', avgHeight: 70 },
  { id: 'river-valley', name: 'River Valley', region: 'central', center: [1.2939, 103.8361], bounds: [[1.2850, 103.8250], [1.3050, 103.8500]], density: 'high', avgHeight: 90 },
  { id: 'rochor', name: 'Rochor', region: 'central', center: [1.3032, 103.8526], bounds: [[1.2950, 103.8400], [1.3150, 103.8650]], density: 'high', avgHeight: 80 },
  { id: 'singapore-river', name: 'Singapore River', region: 'central', center: [1.2870, 103.8489], bounds: [[1.2800, 103.8400], [1.2950, 103.8600]], density: 'medium', avgHeight: 50 },
  { id: 'straits-view', name: 'Straits View', region: 'central', center: [1.2897, 103.8607], bounds: [[1.2850, 103.8550], [1.2950, 103.8700]], density: 'medium', avgHeight: 60 },
  { id: 'tanglin', name: 'Tanglin', region: 'central', center: [1.3048, 103.8145], bounds: [[1.2950, 103.8000], [1.3150, 103.8300]], density: 'medium', avgHeight: 70 },

  // North Region
  { id: 'central-water-catchment', name: 'Central Water Catchment', region: 'north', center: [1.3840, 103.8050], bounds: [[1.3600, 103.7800], [1.4100, 103.8300]], density: 'low', avgHeight: 15 },
  { id: 'lim-chu-kang', name: 'Lim Chu Kang', region: 'north', center: [1.4300, 103.7174], bounds: [[1.4100, 103.6900], [1.4500, 103.7450]], density: 'low', avgHeight: 20 },
  { id: 'mandai', name: 'Mandai', region: 'north', center: [1.4102, 103.7890], bounds: [[1.3950, 103.7700], [1.4250, 103.8100]], density: 'low', avgHeight: 15 },
  { id: 'sembawang', name: 'Sembawang', region: 'north', center: [1.4491, 103.8185], bounds: [[1.4350, 103.8000], [1.4650, 103.8400]], density: 'medium', avgHeight: 45 },
  { id: 'simpang', name: 'Simpang', region: 'north', center: [1.4250, 103.7800], bounds: [[1.4150, 103.7650], [1.4350, 103.7950]], density: 'low', avgHeight: 20 },
  { id: 'sungei-kadut', name: 'Sungei Kadut', region: 'north', center: [1.4130, 103.7500], bounds: [[1.4000, 103.7350], [1.4250, 103.7650]], density: 'low', avgHeight: 25 },
  { id: 'woodlands', name: 'Woodlands', region: 'north', center: [1.4382, 103.7891], bounds: [[1.4200, 103.7700], [1.4550, 103.8100]], density: 'medium', avgHeight: 50 },
  { id: 'yishun', name: 'Yishun', region: 'north', center: [1.4304, 103.8354], bounds: [[1.4150, 103.8200], [1.4450, 103.8500]], density: 'medium', avgHeight: 45 },
  { id: 'ang-mo-kio', name: 'Ang Mo Kio', region: 'north', center: [1.3691, 103.8454], bounds: [[1.3550, 103.8300], [1.3850, 103.8600]], density: 'medium', avgHeight: 40 },
  { id: 'hougang', name: 'Hougang', region: 'north', center: [1.3612, 103.8864], bounds: [[1.3450, 103.8700], [1.3800, 103.9050]], density: 'medium', avgHeight: 40 },
  { id: 'north-eastern-islands', name: 'North-Eastern Islands', region: 'north', center: [1.4100, 103.9600], bounds: [[1.3900, 103.9400], [1.4300, 103.9800]], density: 'low', avgHeight: 10 },
  { id: 'punggol', name: 'Punggol', region: 'north', center: [1.4048, 103.9022], bounds: [[1.3900, 103.8850], [1.4200, 103.9200]], density: 'medium', avgHeight: 45 },
  { id: 'seletar', name: 'Seletar', region: 'north', center: [1.4050, 103.8691], bounds: [[1.3900, 103.8550], [1.4200, 103.8850]], density: 'low', avgHeight: 20 },
  { id: 'sengkang', name: 'Sengkang', region: 'north', center: [1.3868, 103.8914], bounds: [[1.3700, 103.8750], [1.4050, 103.9100]], density: 'medium', avgHeight: 45 },
  { id: 'serangoon', name: 'Serangoon', region: 'north', center: [1.3554, 103.8732], bounds: [[1.3400, 103.8600], [1.3700, 103.8900]], density: 'medium', avgHeight: 40 },

  // East Region
  { id: 'bedok', name: 'Bedok', region: 'east', center: [1.3236, 103.9273], bounds: [[1.3100, 103.9100], [1.3400, 103.9450]], density: 'medium', avgHeight: 40 },
  { id: 'changi', name: 'Changi', region: 'east', center: [1.3644, 103.9915], bounds: [[1.3500, 103.9700], [1.3800, 104.0150]], density: 'low', avgHeight: 25 },
  { id: 'changi-bay', name: 'Changi Bay', region: 'east', center: [1.3900, 104.0200], bounds: [[1.3750, 104.0000], [1.4050, 104.0400]], density: 'low', avgHeight: 15 },
  { id: 'geylang', name: 'Geylang', region: 'east', center: [1.3201, 103.8918], bounds: [[1.3050, 103.8750], [1.3350, 103.9100]], density: 'high', avgHeight: 60 },
  { id: 'marine-parade', name: 'Marine Parade', region: 'east', center: [1.3020, 103.9062], bounds: [[1.2900, 103.8900], [1.3150, 103.9250]], density: 'high', avgHeight: 70 },
  { id: 'pasir-ris', name: 'Pasir Ris', region: 'east', center: [1.3721, 103.9474], bounds: [[1.3600, 103.9300], [1.3850, 103.9650]], density: 'medium', avgHeight: 40 },
  { id: 'paya-lebar', name: 'Paya Lebar', region: 'east', center: [1.3587, 103.9140], bounds: [[1.3450, 103.9000], [1.3750, 103.9300]], density: 'medium', avgHeight: 50 },
  { id: 'tampines', name: 'Tampines', region: 'east', center: [1.3496, 103.9568], bounds: [[1.3350, 103.9400], [1.3650, 103.9750]], density: 'medium', avgHeight: 45 },

  // West Region
  { id: 'boon-lay', name: 'Boon Lay', region: 'west', center: [1.3390, 103.7014], bounds: [[1.3250, 103.6850], [1.3550, 103.7200]], density: 'medium', avgHeight: 40 },
  { id: 'bukit-batok', name: 'Bukit Batok', region: 'west', center: [1.3590, 103.7467], bounds: [[1.3450, 103.7300], [1.3750, 103.7650]], density: 'medium', avgHeight: 40 },
  { id: 'bukit-panjang', name: 'Bukit Panjang', region: 'west', center: [1.3774, 103.7718], bounds: [[1.3600, 103.7550], [1.3950, 103.7900]], density: 'medium', avgHeight: 40 },
  { id: 'choa-chu-kang', name: 'Choa Chu Kang', region: 'west', center: [1.3840, 103.7470], bounds: [[1.3700, 103.7300], [1.4000, 103.7650]], density: 'medium', avgHeight: 40 },
  { id: 'clementi', name: 'Clementi', region: 'west', center: [1.3162, 103.7649], bounds: [[1.3000, 103.7500], [1.3350, 103.7800]], density: 'medium', avgHeight: 45 },
  { id: 'jurong-east', name: 'Jurong East', region: 'west', center: [1.3329, 103.7436], bounds: [[1.3150, 103.7250], [1.3500, 103.7650]], density: 'medium', avgHeight: 50 },
  { id: 'jurong-west', name: 'Jurong West', region: 'west', center: [1.3404, 103.7090], bounds: [[1.3250, 103.6900], [1.3600, 103.7300]], density: 'medium', avgHeight: 40 },
  { id: 'pioneer', name: 'Pioneer', region: 'west', center: [1.3152, 103.6752], bounds: [[1.3000, 103.6600], [1.3300, 103.6950]], density: 'low', avgHeight: 30 },
  { id: 'tengah', name: 'Tengah', region: 'west', center: [1.3740, 103.7140], bounds: [[1.3600, 103.6950], [1.3900, 103.7350]], density: 'low', avgHeight: 30 },
  { id: 'tuas', name: 'Tuas', region: 'west', center: [1.3200, 103.6500], bounds: [[1.2950, 103.6200], [1.3450, 103.6800]], density: 'low', avgHeight: 25 },
  { id: 'western-islands', name: 'Western Islands', region: 'west', center: [1.2050, 103.7450], bounds: [[1.1800, 103.7200], [1.2300, 103.7700]], density: 'low', avgHeight: 15 },
  { id: 'western-water-catchment', name: 'Western Water Catchment', region: 'west', center: [1.4050, 103.7050], bounds: [[1.3850, 103.6850], [1.4250, 103.7250]], density: 'low', avgHeight: 15 },

  // South Region
  { id: 'bishan', name: 'Bishan', region: 'central', center: [1.3526, 103.8352], bounds: [[1.3400, 103.8200], [1.3650, 103.8500]], density: 'medium', avgHeight: 45 },
  { id: 'bukit-merah', name: 'Bukit Merah', region: 'south', center: [1.2818, 103.8238], bounds: [[1.2650, 103.8050], [1.3000, 103.8450]], density: 'high', avgHeight: 70 },
  { id: 'bukit-timah', name: 'Bukit Timah', region: 'central', center: [1.3294, 103.7978], bounds: [[1.3150, 103.7800], [1.3450, 103.8150]], density: 'medium', avgHeight: 50 },
  { id: 'kallang', name: 'Kallang', region: 'central', center: [1.3119, 103.8631], bounds: [[1.2950, 103.8450], [1.3300, 103.8850]], density: 'high', avgHeight: 65 },
  { id: 'novena', name: 'Novena', region: 'central', center: [1.3209, 103.8439], bounds: [[1.3100, 103.8300], [1.3350, 103.8600]], density: 'high', avgHeight: 80 },
  { id: 'queenstown', name: 'Queenstown', region: 'south', center: [1.2942, 103.7861], bounds: [[1.2800, 103.7700], [1.3100, 103.8050]], density: 'medium', avgHeight: 50 },
  { id: 'southern-islands', name: 'Southern Islands', region: 'south', center: [1.2300, 103.8400], bounds: [[1.2000, 103.8100], [1.2600, 103.8700]], density: 'low', avgHeight: 10 },
  { id: 'toa-payoh', name: 'Toa Payoh', region: 'central', center: [1.3343, 103.8563], bounds: [[1.3200, 103.8400], [1.3500, 103.8750]], density: 'medium', avgHeight: 45 },
];

// Convert lat/lng to local 3D coordinates
function latLngTo3D(lat, lng) {
  // Singapore approx center: 1.3521, 103.8198
  const centerLat = 1.3521;
  const centerLng = 103.8198;

  // Approx conversion: 1 degree lat/lng ≈ 111km
  const scale = 111000; // meters per degree

  const x = (lng - centerLng) * scale;
  const z = -(lat - centerLat) * scale; // Negative because Three.js z-axis

  return { x, z };
}

// Generate buildings for a planning area
function generateBuildings(planningArea) {
  const { id, bounds, density, avgHeight } = planningArea;

  // Building count based on density - increased for realism
  const buildingCounts = {
    high: 400,    // Dense urban areas like Downtown Core
    medium: 250,  // Residential areas
    low: 120,     // Parks, industrial, water catchment
  };

  const buildingCount = buildingCounts[density] || 80;
  const buildings = [];

  // Convert bounds to 3D coordinates
  const sw = latLngTo3D(bounds[0][0], bounds[0][1]); // Southwest
  const ne = latLngTo3D(bounds[1][0], bounds[1][1]); // Northeast

  // Calculate center of this area to use as origin
  const centerX = (sw.x + ne.x) / 2;
  const centerZ = (sw.z + ne.z) / 2;

  // Calculate local size (relative to center)
  const localWidth = ne.x - sw.x;
  const localDepth = ne.z - sw.z;

  // Seeded random for consistency
  const random = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < buildingCount; i++) {
    const seed = id.charCodeAt(0) * 10000 + i * 7;

    // Random position within bounds, relative to center (origin at 0,0)
    const x = (random(seed) - 0.5) * localWidth;
    const z = (random(seed + 1) - 0.5) * localDepth;

    // Building dimensions - varied sizes for realism
    const sizeType = random(seed + 2);
    let width, depth;

    if (sizeType < 0.3) {
      // Small buildings (30%)
      width = 15 + random(seed + 3) * 25;  // 15-40m
      depth = 15 + random(seed + 4) * 25;
    } else if (sizeType < 0.7) {
      // Medium buildings (40%)
      width = 30 + random(seed + 3) * 40;  // 30-70m
      depth = 30 + random(seed + 4) * 40;
    } else {
      // Large buildings (30%)
      width = 50 + random(seed + 3) * 80;  // 50-130m
      depth = 50 + random(seed + 4) * 80;
    }

    // Height based on area average with variation
    const heightVariation = 0.6 + random(seed + 5) * 1.2; // 0.6x to 1.8x
    const height = avgHeight * heightVariation;

    // Create rectangular footprint (coordinates centered at 0,0)
    buildings.push({
      footprint: [
        [x, z],
        [x + width, z],
        [x + width, z + depth],
        [x, z + depth],
        [x, z],
      ],
      height: height,
    });
  }

  return buildings;
}

// Generate all building data
console.log('Generating building data for all 55 planning areas...');

const outputDir = path.join(__dirname, '../public/buildings');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

PLANNING_AREAS.forEach((area) => {
  const buildings = generateBuildings(area);
  const data = {
    planningArea: area.name,
    id: area.id,
    buildingCount: buildings.length,
    buildings: buildings,
  };

  const outputPath = path.join(outputDir, `${area.id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✓ Generated ${buildings.length} buildings for ${area.name}`);
});

console.log(`\n✅ Complete! Generated building data for ${PLANNING_AREAS.length} planning areas.`);
