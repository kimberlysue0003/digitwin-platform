// Service to fetch building data from OpenStreetMap
import { BuildingCollection, BuildingFeature } from '../types/building';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Singapore bounding box: [minLat, minLon, maxLat, maxLon]
const SINGAPORE_BBOX = [1.1304, 103.6920, 1.4504, 104.0120];

export async function fetchBuildingsInArea(
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 2000
): Promise<BuildingCollection> {
  // Calculate bounding box around center point
  const latOffset = radiusMeters / 111000; // 1 degree ≈ 111km
  const lngOffset = radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180));

  const bbox = [
    centerLat - latOffset,
    centerLng - lngOffset,
    centerLat + latOffset,
    centerLng + lngOffset,
  ];

  // Overpass QL query to get buildings
  const query = `
    [out:json][timeout:25];
    (
      way["building"](${bbox.join(',')});
      relation["building"](${bbox.join(',')});
    );
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    return convertOSMToGeoJSON(data);
  } catch (error) {
    console.error('Failed to fetch buildings from OSM:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

export async function fetchAllSingaporeBuildings(): Promise<BuildingCollection> {
  const query = `
    [out:json][timeout:60];
    (
      way["building"](${SINGAPORE_BBOX.join(',')});
    );
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.elements?.length || 0} buildings from OSM`);
    return convertOSMToGeoJSON(data);
  } catch (error) {
    console.error('Failed to fetch Singapore buildings from OSM:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

function convertOSMToGeoJSON(osmData: any): BuildingCollection {
  const features: BuildingFeature[] = [];

  osmData.elements?.forEach((element: any) => {
    if (element.type === 'way' && element.geometry) {
      const coordinates = element.geometry.map((node: any) => [node.lon, node.lat]);

      // Close the polygon if not already closed
      if (coordinates.length > 0) {
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coordinates.push([...first]);
        }
      }

      // Estimate height from levels or use default
      const levels = parseInt(element.tags?.['building:levels'] || element.tags?.levels) || 3;
      const height = parseFloat(element.tags?.height) || levels * 3.5;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
        properties: {
          id: element.id,
          name: element.tags?.name,
          height: height,
          levels: levels,
          building_type: element.tags?.building,
        },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
