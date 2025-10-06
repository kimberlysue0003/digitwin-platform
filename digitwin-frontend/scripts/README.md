# Digital Twin Scripts

Scripts for generating and managing 2D maps and 3D building data for the Singapore Digital Twin platform.

## Architecture

### Reusable Modules (`lib/`)

#### `mapCaptureWithClipping.js`
Captures 2D maps from OpenStreetMap with polygon clipping.

**Key Features:**
- Uses Puppeteer to render Leaflet maps
- Applies polygon clipping to match planning area boundaries
- Saves actualBounds from Leaflet for coordinate alignment
- Generates transparent PNGs with accurate area shapes

**Usage:**
```javascript
import { captureMapWithClipping } from './lib/mapCaptureWithClipping.js';

const result = await captureMapWithClipping({
  areaId: 'ang-mo-kio',
  bounds: [[1.355, 103.816], [1.397, 103.860]],
  geometry: { type: 'Polygon', coordinates: [...] },
  outputDir: './public/map-textures',
  metadataDir: './public/map-textures',
  zoom: 15,
  size: 2048
});
```

#### `buildingDataFetcher.js`
Fetches building data from OpenStreetMap Overpass API.

**Key Features:**
- Fetches buildings from OSM using actualBounds from map textures
- Filters buildings using point-in-polygon algorithm
- Converts lat/lng to local coordinates using same center as 2D map
- Ensures perfect 2D/3D alignment

**Usage:**
```javascript
import { fetchBuildingData, loadMapMetadata } from './lib/buildingDataFetcher.js';

// Load map metadata to get actualBounds
const metadata = loadMapMetadata('./public/map-textures/ang-mo-kio.json');

const result = await fetchBuildingData({
  areaId: 'ang-mo-kio',
  bounds: metadata.bounds,  // Use actualBounds from map
  geometry: metadata.geometry,
  outputDir: './public/buildings'
});
```

## Main Scripts

### `regenerateAreaData.js` - Unified Area Data Generator

Regenerates 2D maps and 3D building data for one or more planning areas.

**Basic Usage:**
```bash
# Regenerate both maps and buildings for specific areas
node regenerateAreaData.js ang-mo-kio bedok bishan

# Regenerate all areas
node regenerateAreaData.js all

# Only regenerate 2D maps
node regenerateAreaData.js --maps-only ang-mo-kio

# Only regenerate building data
node regenerateAreaData.js --buildings-only ang-mo-kio

# Skip areas that already have data
node regenerateAreaData.js --skip-existing all
```

**How It Works:**
1. **2D Map Generation:**
   - Loads planning area geometry from `planning-areas.json`
   - Renders map using Leaflet in headless browser
   - Captures actualBounds (may differ from input bounds)
   - Clips map image to polygon shape
   - Saves PNG and metadata JSON

2. **3D Building Data:**
   - Loads actualBounds from map metadata
   - Fetches buildings from OSM Overpass API
   - Filters buildings using polygon geometry
   - Converts coordinates using actualBounds center
   - Saves building JSON with metadata

### Other Scripts

#### `refetchBuildingsWithMapBounds.js`
Low-level script to refetch building data using map bounds.

```bash
node refetchBuildingsWithMapBounds.js ang-mo-kio bedok
```

#### `batchCaptureWithClipping.js`
Original batch map capture script (can be deprecated).

## Key Concepts

### actualBounds vs originalBounds

**originalBounds**: The input bounds from planning area geometry
- May not match exactly what Leaflet displays
- Used historically but caused alignment issues

**actualBounds**: The actual bounds Leaflet uses after `fitBounds()`
- Retrieved from `map.getBounds()` after rendering
- Used for both 2D maps and 3D buildings
- Ensures perfect alignment

### Coordinate System

All coordinates use the same transformation:

```javascript
const centerLat = (minLat + maxLat) / 2;
const centerLng = (minLng + maxLng) / 2;
const scale = 111000;  // meters per degree

function toLocal(lat, lng) {
  const x = (lng - centerLng) * scale;
  const z = (lat - centerLat) * scale;
  return [x, z];
}
```

**Critical**: Both 2D maps and 3D buildings must use the **same bounds** and **same center** for alignment.

### Polygon Clipping

2D maps are clipped to match planning area shapes:

1. Convert polygon coordinates to screen space
2. Create clipping path on canvas
3. Draw map image inside clipping region
4. Result: Transparent areas outside polygon

## Data Flow

```
planning-areas.json
        ↓
    [Map Capture]
        ↓
    actualBounds ← Leaflet calculates these
        ↓
    map-textures/
    ├── {area-id}.png       (clipped image)
    └── {area-id}.json      (metadata with actualBounds)
        ↓
    [Building Fetch]
        ↓
    buildings/{area-id}.json (aligned coordinates)
```

## File Structure

```
scripts/
├── lib/
│   ├── mapCaptureWithClipping.js    # 2D map module
│   └── buildingDataFetcher.js       # 3D building module
├── regenerateAreaData.js            # Main unified script
├── refetchBuildingsWithMapBounds.js # Building refetch tool
└── README.md                        # This file

public/
├── planning-areas.json              # Planning area definitions
├── map-textures/
│   ├── {area-id}.png               # 2D map images
│   └── {area-id}.json              # Map metadata
└── buildings/
    └── {area-id}.json              # Building data
```

## Troubleshooting

### 2D/3D Misalignment
**Cause**: Buildings and maps using different bounds/center
**Solution**: Re-fetch buildings using map metadata:
```bash
node regenerateAreaData.js --buildings-only {area-id}
```

### OSM API Timeout (504)
**Cause**: Overpass API overloaded
**Solution**: Retry after a few minutes or reduce area size

### OSM API Rate Limit (429)
**Cause**: Too many requests
**Solution**: Script has 2-second delays, but you may need to wait longer

### Map Not Clipped
**Cause**: Using old map generation script
**Solution**: Use `regenerateAreaData.js --maps-only {area-id}`

## Development

### Adding a New Planning Area

1. Add area to `planning-areas.json`:
```json
{
  "id": "new-area",
  "name": "New Area",
  "bounds": [[minLat, minLng], [maxLat, maxLng]],
  "geometry": { ... }
}
```

2. Generate data:
```bash
node regenerateAreaData.js new-area
```

### Modifying Coordinate System

If you need to change the coordinate scale or center calculation:

1. Update `buildingDataFetcher.js` `toLocal()` function
2. Update frontend `GroundMapLayer.tsx` to match
3. Regenerate all building data

## Best Practices

1. **Always use actualBounds** from map metadata for building data
2. **Test with one area first** before batch processing
3. **Keep 2-second delay** between OSM API calls
4. **Backup data** before regenerating large batches
5. **Check alignment** in browser after regenerating

## Migration from Old Scripts

Old scripts have been deprecated:
- `batchCaptureNonWestWithClipping.js` → `regenerateAreaData.js`
- `batchRefetchBuildingsNonWest.js` → `regenerateAreaData.js`
- `regenerate-non-west-maps.js` → `regenerateAreaData.js`

Use the new unified script with appropriate options.
