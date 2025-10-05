# Backend Data Architecture Design

## Data Flow Strategy

```
External APIs (NEA)          Our Backend              Frontend
─────────────────           ─────────────            ──────────

Temperature (1min) ──┐      ┌─> Cache Layer         WebSocket
Wind (1min)         ─┼──>───┤   (Redis)      ──>    (real-time)
Rainfall (5min)      │      └─> Time-series DB
PM2.5 (1h)          ─┤          (PostgreSQL)        REST API
PSI (1h)            ─┘                               (queries)

Building GeoJSON    ──>──── Spatial DB ────────>    Initial Load
(Static, one-time)          (PostGIS)               (on demand)
```

---

## Database Schema Design

### Core Principle
**Do NOT duplicate real-time data from NEA APIs into database**
- NEA APIs are already the "source of truth"
- Backend acts as intelligent proxy + cache + aggregator
- Only store: historical data, computed results, spatial reference data

---

## 1. Static Spatial Data (PostGIS)

### Table: `buildings`
```sql
-- Building footprints with height (loaded once from GeoJSON)
CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,           -- Original ID from URA/NUS dataset
  name TEXT,
  geom GEOMETRY(Polygon, 4326),      -- WGS84 footprint
  height FLOAT,                       -- meters
  levels INT,                         -- number of floors
  building_type TEXT,                 -- HDB/Commercial/Industrial/Residential
  year_completed INT,
  data_source TEXT,                   -- 'URA' or 'NUS_HDB'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buildings_geom ON buildings USING GIST(geom);
CREATE INDEX idx_buildings_type ON buildings(building_type);

-- Spatial query examples:
-- Find buildings in bounding box:
-- SELECT * FROM buildings WHERE ST_Intersects(geom, ST_MakeEnvelope(...));
```

### Table: `weather_stations`
```sql
-- Reference data for NEA weather stations (semi-static)
CREATE TABLE weather_stations (
  id SERIAL PRIMARY KEY,
  station_id TEXT UNIQUE NOT NULL,   -- 'S109', 'S44', etc.
  station_name TEXT,                  -- 'Ang Mo Kio Ave 5'
  location GEOMETRY(Point, 4326),     -- (lat, lng)
  station_type TEXT[],                -- ['temperature', 'wind', 'rainfall']
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stations_location ON weather_stations USING GIST(location);

-- Purpose:
-- 1. Map station_id to coordinates for frontend visualization
-- 2. Spatial queries: find nearest station to a point
```

### Table: `pollution_regions`
```sql
-- 5 pollution monitoring regions (North/South/East/West/Central)
CREATE TABLE pollution_regions (
  id SERIAL PRIMARY KEY,
  region_name TEXT UNIQUE,            -- 'north', 'south', 'east', 'west', 'central'
  region_polygon GEOMETRY(Polygon, 4326), -- Approximate boundary
  center_point GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purpose: Visualize pollution zones on map
```

---

## 2. Time-Series Data (PostgreSQL + TimescaleDB Extension)

**Why store historical data?**
- Trend analysis and charts
- Offline demo mode
- Reduce API call frequency (cache recent data)
- Compute aggregates (hourly avg, daily max, etc.)

### Table: `weather_readings_history`
```sql
-- Enable TimescaleDB for time-series optimization
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE weather_readings_history (
  time TIMESTAMPTZ NOT NULL,
  station_id TEXT NOT NULL,
  temperature FLOAT,
  wind_speed FLOAT,              -- knots
  wind_direction FLOAT,          -- degrees 0-360
  rainfall FLOAT,                -- mm
  data_source TEXT DEFAULT 'NEA',
  CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES weather_stations(station_id)
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('weather_readings_history', 'time');

-- Indexes
CREATE INDEX idx_weather_time_station ON weather_readings_history (time DESC, station_id);

-- Retention policy: auto-delete data older than 30 days
SELECT add_retention_policy('weather_readings_history', INTERVAL '30 days');

-- Continuous aggregates (hourly averages)
CREATE MATERIALIZED VIEW weather_hourly_avg
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  station_id,
  AVG(temperature) as avg_temp,
  AVG(wind_speed) as avg_wind_speed,
  SUM(rainfall) as total_rainfall
FROM weather_readings_history
GROUP BY hour, station_id;
```

### Table: `pollution_readings_history`
```sql
CREATE TABLE pollution_readings_history (
  time TIMESTAMPTZ NOT NULL,
  region_name TEXT NOT NULL,
  pm25 FLOAT,
  psi FLOAT,
  data_source TEXT DEFAULT 'NEA'
);

SELECT create_hypertable('pollution_readings_history', 'time');
CREATE INDEX idx_pollution_time_region ON pollution_readings_history (time DESC, region_name);
SELECT add_retention_policy('pollution_readings_history', INTERVAL '90 days');
```

---

## 3. Cache Layer (Redis)

**Purpose**: Store latest real-time data for ultra-fast access

### Redis Keys Structure

```
# Latest readings from NEA API (TTL: 5 minutes)
nea:latest:temperature          → JSON array of all station readings
nea:latest:wind                 → JSON { speed: [...], direction: [...] }
nea:latest:pm25                 → JSON { north: 10, south: 11, ... }
nea:latest:psi                  → JSON { ... }
nea:latest:rainfall             → JSON array

# Aggregated data for frontend
nea:aggregated:wind_avg         → JSON { avg_speed: 5.2, avg_direction: 120 }
nea:aggregated:temp_avg         → JSON { avg: 31.5, min: 30, max: 33.6 }

# API rate limiting
nea:ratelimit:pm25              → Counter (reset every 1 hour)
nea:ratelimit:temperature       → Counter (reset every 1 minute)

# WebSocket connection tracking
ws:connections                  → Set of connection IDs
ws:client:{clientId}:subscriptions → Set ['temperature', 'wind', 'pollution']
```

### Redis Data Flow
```typescript
// Backend service
async function getLatestTemperature() {
  // 1. Try Redis first
  const cached = await redis.get('nea:latest:temperature');
  if (cached) return JSON.parse(cached);

  // 2. Fetch from NEA API
  const fresh = await fetch('https://api-open.data.gov.sg/v2/real-time/api/air-temperature');
  const data = await fresh.json();

  // 3. Cache for 1 minute
  await redis.setex('nea:latest:temperature', 60, JSON.stringify(data));

  // 4. Also save to PostgreSQL for history
  await saveToHistory(data);

  return data;
}
```

---

## 4. Computed/Derived Data

### Table: `spatial_interpolations`
```sql
-- Pre-computed interpolated grids for smooth visualization
CREATE TABLE spatial_interpolations (
  id SERIAL PRIMARY KEY,
  data_type TEXT,                     -- 'temperature', 'wind', 'pm25'
  computed_at TIMESTAMPTZ NOT NULL,
  grid_resolution FLOAT,              -- meters (e.g., 500m grid)
  grid_data JSONB,                    -- Interpolated values as GeoJSON FeatureCollection
  bbox GEOMETRY(Polygon, 4326),       -- Bounding box of grid
  metadata JSONB                      -- { method: 'IDW', params: {...} }
);

-- Purpose: Frontend can fetch pre-computed smooth temperature/wind field
-- Example grid_data structure:
-- {
--   "type": "FeatureCollection",
--   "features": [
--     { "geometry": {"type": "Point", "coordinates": [103.8, 1.35]},
--       "properties": {"value": 31.2} },
--     ...
--   ]
-- }
```

### Table: `alert_thresholds`
```sql
-- Configuration for environmental alerts
CREATE TABLE alert_thresholds (
  id SERIAL PRIMARY KEY,
  metric_type TEXT,                   -- 'pm25', 'psi', 'temperature'
  threshold_value FLOAT,
  severity TEXT,                      -- 'warning', 'danger', 'critical'
  is_active BOOLEAN DEFAULT true
);

-- Example: PM2.5 > 55 = unhealthy
INSERT INTO alert_thresholds (metric_type, threshold_value, severity)
VALUES ('pm25', 55, 'unhealthy');
```

---

## 5. Application State & Configuration

### Table: `system_config`
```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples:
INSERT INTO system_config (key, value, description) VALUES
  ('nea_api_poll_interval', '30', 'Seconds between NEA API polls'),
  ('websocket_broadcast_interval', '5', 'Seconds between WebSocket broadcasts'),
  ('data_retention_days', '30', 'Days to keep historical weather data'),
  ('default_map_center', '{"lat": 1.35, "lng": 103.8}', 'Singapore center'),
  ('default_map_zoom', '11', 'Initial map zoom level');
```

### Table: `api_usage_logs`
```sql
-- Track external API calls for monitoring
CREATE TABLE api_usage_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  api_endpoint TEXT,
  response_time_ms INT,
  status_code INT,
  error_message TEXT
);

CREATE INDEX idx_api_logs_timestamp ON api_usage_logs (timestamp DESC);
```

---

## Backend Services Architecture

### Service 1: NEA Data Fetcher (Background Job)
```typescript
// services/neaPoller.ts
import { BullMQ } from 'bullmq';

// Job runs every 30 seconds
const queue = new Queue('nea-poller');

queue.add('fetch-all', {}, {
  repeat: { every: 30000 } // 30 seconds
});

queue.process('fetch-all', async () => {
  const [temp, wind, pollution, rainfall] = await Promise.all([
    fetchTemperature(),  // Calls NEA API + updates Redis + saves to PG
    fetchWind(),
    fetchPollution(),
    fetchRainfall()
  ]);

  // Broadcast to all WebSocket clients
  wsServer.broadcast({ type: 'environment_update', data: { temp, wind, pollution, rainfall } });
});
```

### Service 2: WebSocket Real-time Server
```typescript
// server.ts
fastify.register(websocket);

fastify.get('/ws', { websocket: true }, (socket, req) => {
  const clientId = generateId();

  // Send latest data immediately
  socket.send(JSON.stringify({
    type: 'initial_data',
    data: await getLatestFromRedis()
  }));

  // Client subscribes to specific data types
  socket.on('message', (msg) => {
    const { action, subscriptions } = JSON.parse(msg);
    if (action === 'subscribe') {
      redis.sadd(`ws:client:${clientId}:subscriptions`, ...subscriptions);
    }
  });

  // Cleanup on disconnect
  socket.on('close', () => {
    redis.del(`ws:client:${clientId}:subscriptions`);
  });
});
```

### Service 3: Spatial API
```typescript
// routes/spatial.ts

// Get buildings in viewport
fastify.get('/api/buildings/bbox', async (req, reply) => {
  const { minLng, minLat, maxLng, maxLat } = req.query;

  const buildings = await prisma.$queryRaw`
    SELECT
      id, name, height, levels, building_type,
      ST_AsGeoJSON(geom) as geometry
    FROM buildings
    WHERE ST_Intersects(
      geom,
      ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
    )
    LIMIT 10000
  `;

  return {
    type: 'FeatureCollection',
    features: buildings.map(b => ({
      type: 'Feature',
      geometry: JSON.parse(b.geometry),
      properties: { id: b.id, name: b.name, height: b.height }
    }))
  };
});

// Get interpolated temperature grid
fastify.get('/api/environment/temperature/grid', async (req, reply) => {
  // Check if recent grid exists
  const cached = await prisma.spatial_interpolations.findFirst({
    where: {
      data_type: 'temperature',
      computed_at: { gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 min ago
    }
  });

  if (cached) return cached.grid_data;

  // Compute new grid using IDW interpolation
  const stations = await getLatestTemperatureFromRedis();
  const grid = await computeIDWGrid(stations, 500); // 500m resolution

  // Save for future requests
  await prisma.spatial_interpolations.create({
    data: {
      data_type: 'temperature',
      grid_resolution: 500,
      grid_data: grid,
      bbox: getSingaporeBBox()
    }
  });

  return grid;
});
```

---

## Data Storage Summary

| Data Type | Storage | Retention | Purpose |
|-----------|---------|-----------|---------|
| Buildings | PostgreSQL/PostGIS | Permanent | Static 3D geometry |
| Weather Stations | PostgreSQL | Permanent | Reference data |
| Latest Real-time Data | Redis | 5 min TTL | Fast WebSocket delivery |
| Historical Weather | PostgreSQL (TimescaleDB) | 30 days | Trend analysis, charts |
| Historical Pollution | PostgreSQL (TimescaleDB) | 90 days | Compliance, reporting |
| Interpolated Grids | PostgreSQL | 1 hour | Smooth visualization |
| API Logs | PostgreSQL | 7 days | Monitoring |

---

## Key Design Decisions

### ✅ DO Store:
1. **Building footprints** - Static, queried frequently by bbox
2. **Weather station metadata** - Reference for spatial queries
3. **Historical readings (30 days)** - For charts and offline mode
4. **Pre-computed interpolations** - Expensive to calculate in real-time
5. **Configuration** - Poll intervals, thresholds, etc.

### ❌ DON'T Store:
1. **Real-time NEA data as primary source** - APIs are already reliable
2. **All historical data forever** - Use retention policies (30-90 days)
3. **Duplicate GeoJSON in multiple tables** - Query PostGIS on demand

### 🚀 Performance Optimizations:
1. **Redis cache** - Sub-millisecond access to latest data
2. **TimescaleDB** - Automatic partitioning for time-series
3. **Spatial indexes** - GIST index on all geometry columns
4. **Materialized views** - Pre-aggregated hourly/daily stats
5. **WebSocket** - Push model instead of polling

---

## Environment Variables Required

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/digitwin
REDIS_URL=redis://localhost:6379

# NEA API (optional, currently no key needed)
NEA_API_KEY=
NEA_API_BASE_URL=https://api-open.data.gov.sg/v2/real-time/api

# Application
POLL_INTERVAL_SECONDS=30
WS_BROADCAST_INTERVAL_SECONDS=5
DATA_RETENTION_DAYS=30

# Optional: for task queue
REDIS_BULLMQ_URL=redis://localhost:6379/1
```

---

## Initial Data Loading Tasks

1. **Download building GeoJSON** (one-time)
   ```bash
   curl -O https://data.gov.sg/datasets/[...]/download
   ```

2. **Import to PostGIS** (using ogr2ogr or custom script)
   ```bash
   ogr2ogr -f PostgreSQL PG:"dbname=digitwin" buildings.geojson -nln buildings
   ```

3. **Populate weather stations** (from first API call)
   - Fetch temperature/wind/rainfall APIs
   - Extract unique station_id + coordinates
   - INSERT into weather_stations table

4. **Define pollution regions** (manual or from NEA docs)
   - Create approximate polygons for N/S/E/W/C zones

---

## Next Implementation Steps

1. Set up PostgreSQL with PostGIS extension
2. Set up Redis for caching
3. Create database schema (run SQL scripts)
4. Build NEA API client service
5. Implement background polling with BullMQ
6. Build WebSocket server
7. Create REST API endpoints for spatial queries
