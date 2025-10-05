// Batch process all 54 planning areas (excluding choa-chu-kang which is already done)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import planning areas
const planningAreasPath = path.join(__dirname, '../src/data/planningAreas.ts');
const planningAreasContent = fs.readFileSync(planningAreasPath, 'utf-8');

// Extract planning area IDs from the TypeScript file
const areaMatches = planningAreasContent.matchAll(/id:\s*'([^']+)'/g);
const allAreaIds = Array.from(areaMatches, m => m[1]);

// Exclude already processed area
const areasToProcess = allAreaIds.filter(id => id !== 'choa-chu-kang');

console.log(`Found ${allAreaIds.length} total planning areas`);
console.log(`Processing ${areasToProcess.length} areas (excluding choa-chu-kang)`);
console.log('\nAreas to process:');
areasToProcess.forEach((id, i) => console.log(`${i + 1}. ${id}`));

// Export for use by other scripts
fs.writeFileSync(
  path.join(__dirname, 'areasToProcess.json'),
  JSON.stringify(areasToProcess, null, 2)
);

console.log('\n✅ Area list saved to areasToProcess.json');
console.log('\nNext steps:');
console.log('1. Run: node scripts/batchGenerateBuildingData.js');
console.log('2. Run: node scripts/batchGenerateWindStreamlines.js');
console.log('3. Run: node scripts/batchGenerateGroundMaps.js');
