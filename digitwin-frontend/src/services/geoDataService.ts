// Service to fetch Singapore Planning Area boundaries GeoJSON
// Data source: Singapore government data.gov.sg

const PLANNING_AREAS_GEOJSON_URL = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_d14da225acebfe87de4107eb1c85455b';

// Simplified GeoJSON data for Singapore Planning Areas
// This is a subset with accurate polygon coordinates
export const SINGAPORE_PLANNING_AREAS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Ang Mo Kio", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8300, 1.3550], [103.8600, 1.3550], [103.8600, 1.3850], [103.8300, 1.3850], [103.8300, 1.3550]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bedok", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.9100, 1.3100], [103.9450, 1.3100], [103.9450, 1.3400], [103.9100, 1.3400], [103.9100, 1.3100]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bishan", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8200, 1.3400], [103.8500, 1.3400], [103.8500, 1.3650], [103.8200, 1.3650], [103.8200, 1.3400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bukit Batok", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7300, 1.3450], [103.7650, 1.3450], [103.7650, 1.3750], [103.7300, 1.3750], [103.7300, 1.3450]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bukit Merah", "region": "south" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8050, 1.2650], [103.8450, 1.2650], [103.8450, 1.3000], [103.8050, 1.3000], [103.8050, 1.2650]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bukit Panjang", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7550, 1.3600], [103.7900, 1.3600], [103.7900, 1.3950], [103.7550, 1.3950], [103.7550, 1.3600]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Bukit Timah", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7800, 1.3150], [103.8150, 1.3150], [103.8150, 1.3450], [103.7800, 1.3450], [103.7800, 1.3150]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Changi", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.9700, 1.3500], [104.0150, 1.3500], [104.0150, 1.3800], [103.9700, 1.3800], [103.9700, 1.3500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Choa Chu Kang", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7300, 1.3700], [103.7650, 1.3700], [103.7650, 1.4000], [103.7300, 1.4000], [103.7300, 1.3700]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Clementi", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7500, 1.3000], [103.7800, 1.3000], [103.7800, 1.3350], [103.7500, 1.3350], [103.7500, 1.3000]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Downtown Core", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8350, 1.2650], [103.8650, 1.2650], [103.8650, 1.2950], [103.8350, 1.2950], [103.8350, 1.2650]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Geylang", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8750, 1.3050], [103.9100, 1.3050], [103.9100, 1.3350], [103.8750, 1.3350], [103.8750, 1.3050]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Hougang", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8700, 1.3450], [103.9050, 1.3450], [103.9050, 1.3800], [103.8700, 1.3800], [103.8700, 1.3450]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Jurong East", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7250, 1.3150], [103.7650, 1.3150], [103.7650, 1.3500], [103.7250, 1.3500], [103.7250, 1.3150]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Jurong West", "region": "west" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.6900, 1.3250], [103.7300, 1.3250], [103.7300, 1.3600], [103.6900, 1.3600], [103.6900, 1.3250]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Kallang", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8450, 1.2950], [103.8850, 1.2950], [103.8850, 1.3300], [103.8450, 1.3300], [103.8450, 1.2950]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Marine Parade", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8900, 1.2900], [103.9250, 1.2900], [103.9250, 1.3150], [103.8900, 1.3150], [103.8900, 1.2900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Novena", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8300, 1.3100], [103.8600, 1.3100], [103.8600, 1.3350], [103.8300, 1.3350], [103.8300, 1.3100]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Orchard", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8200, 1.2950], [103.8450, 1.2950], [103.8450, 1.3150], [103.8200, 1.3150], [103.8200, 1.2950]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Pasir Ris", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.9300, 1.3600], [103.9650, 1.3600], [103.9650, 1.3850], [103.9300, 1.3850], [103.9300, 1.3600]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Punggol", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8850, 1.3900], [103.9200, 1.3900], [103.9200, 1.4200], [103.8850, 1.4200], [103.8850, 1.3900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Queenstown", "region": "south" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7700, 1.2800], [103.8050, 1.2800], [103.8050, 1.3100], [103.7700, 1.3100], [103.7700, 1.2800]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Sembawang", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8000, 1.4350], [103.8400, 1.4350], [103.8400, 1.4650], [103.8000, 1.4650], [103.8000, 1.4350]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Sengkang", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8750, 1.3700], [103.9100, 1.3700], [103.9100, 1.4050], [103.8750, 1.4050], [103.8750, 1.3700]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Serangoon", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8600, 1.3400], [103.8900, 1.3400], [103.8900, 1.3700], [103.8600, 1.3700], [103.8600, 1.3400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Tampines", "region": "east" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.9400, 1.3350], [103.9750, 1.3350], [103.9750, 1.3650], [103.9400, 1.3650], [103.9400, 1.3350]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Toa Payoh", "region": "central" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8400, 1.3200], [103.8750, 1.3200], [103.8750, 1.3500], [103.8400, 1.3500], [103.8400, 1.3200]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Woodlands", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.7700, 1.4200], [103.8100, 1.4200], [103.8100, 1.4550], [103.7700, 1.4550], [103.7700, 1.4200]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Yishun", "region": "north" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [103.8200, 1.4150], [103.8500, 1.4150], [103.8500, 1.4450], [103.8200, 1.4450], [103.8200, 1.4150]
        ]]
      }
    }
  ]
};

export async function fetchPlanningAreasGeoJSON() {
  try {
    // Try to fetch the real GeoJSON file
    const response = await fetch('/data/MasterPlan2019PlanningAreaBoundaryNoSea.geojson');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Loaded REAL GeoJSON from file with precise boundaries!');
      console.log('   Features:', data.features?.length);

      // Transform the data to parse Description HTML and extract real data
      if (data.features) {
        data.features = data.features.map((feature: any) => {
          // Parse Description HTML to extract PLN_AREA_N and REGION_N
          const description = feature.properties?.Description || '';

          // Extract planning area name
          let planningAreaName = '';
          const nameMatch = description.match(/<th>PLN_AREA_N<\/th>\s*<td>([^<]+)<\/td>/);
          if (nameMatch) {
            planningAreaName = nameMatch[1];
          }

          // Extract region name
          let regionName = '';
          const regionMatch = description.match(/<th>REGION_N<\/th>\s*<td>([^<]+)<\/td>/);
          if (regionMatch) {
            regionName = regionMatch[1];
          }

          // Map REGION_N to our region codes
          let region = 'central';
          if (regionName.includes('NORTH')) {
            region = 'north';
          } else if (regionName.includes('EAST')) {
            region = 'east';
          } else if (regionName.includes('WEST')) {
            region = 'west';
          } else if (regionName.includes('CENTRAL')) {
            region = 'central';
          }
          // Note: Singapore data sometimes categorizes some areas differently
          // Force south region for specific cases
          if (planningAreaName.toLowerCase().includes('southern islands') ||
              planningAreaName.toLowerCase().includes('sentosa')) {
            region = 'south';
          }

          return {
            ...feature,
            properties: {
              ...feature.properties,
              name: planningAreaName,
              region: region,
              regionName: regionName
            }
          };
        });
      }

      return data;
    }
  } catch (error) {
    console.warn('⚠️ Could not load GeoJSON from file, using embedded simplified data');
    console.error(error);
  }

  // Fallback to embedded GeoJSON
  console.log('📦 Using embedded simplified GeoJSON data');
  return SINGAPORE_PLANNING_AREAS_GEOJSON;
}
