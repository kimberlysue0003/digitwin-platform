# City Digital Twin Platform - Development Plan

## Project Overview
3D visualization of Singapore city with real-time environmental data overlay including weather, wind speed/direction, and pollution levels.

## Tech Stack

### Frontend
- React + Vite + TypeScript
- Three.js (core 3D rendering)
- @react-three/fiber + @react-three/drei
- Zustand (global state)
- TanStack Query (data fetching/caching)
- Tailwind CSS (styling)
- WebSocket client (native or isomorphic-ws)

### Backend
- Node.js + Fastify
- PostgreSQL + PostGIS (spatial data & queries)
- Prisma ORM (regular tables; spatial fields use raw SQL)
- ws / Socket.IO (real-time push)
- Optional: BullMQ (task queue for data polling)

### Data & Visualization Goals (MVP)
- **Base geometry**: Building footprints (GeoJSON/Shapefile) with height/levels attributes
- **3D city**: Extrude footprints into 3D blocks in Three.js
- **Coordinate system**: WGS84 → local projection or simple planar conversion
- **Real-time overlay**: Sensor data (temperature/PM2.5/wind) → WebSocket real-time rendering
- **Weather simulation**: Deferred to future phase

---

## Core Features (Revised Priority)

1. **3D Singapore City Model**
2. **Real-time Weather Data Overlay** (temperature/rainfall/cloud)
3. **Wind Speed & Direction Visualization** (particle flow field)
4. **Pollution Data Heatmap** (PM2.5/PSI)

---

## Singapore Real-time Environment Data APIs

### ✅ VERIFIED - All APIs Are Functional (Tested 2025-10-05)

**Base URL**: `https://api-open.data.gov.sg/v2/real-time/api/`

| API Endpoint | Data Content | Update Frequency | Sample Data | Visualization Method |
|-------------|--------------|------------------|------------|---------------------|
| `/pm25` | PM2.5 concentration (5 regions) | Hourly | West: 11, Central: 7 | Heatmap/regional color overlay |
| `/psi` | PSI pollution index (5 regions) | Hourly | West: 54, Central: 55 | Color-graded heatmap |
| `/air-temperature` | Multi-station temperature | Per minute | 12 stations (30-33.6°C) | Temperature field interpolation |
| `/wind-speed` | Wind speed (13 stations) | Per minute | Range: 1.6-10.5 knots | Particle velocity |
| `/wind-direction` | Wind direction (13 stations) | Per minute | Range: 0-360 degrees | Particle direction vector |
| `/rainfall` | Real-time rainfall (54 stations) | Every 5 min | All stations (mm) | Rain particle effect |

**Key Features:**
- ✅ **No API key required** for basic access (rate limits apply from Nov 2025)
- ✅ **Geographic coordinates** included for all weather stations
- ✅ **JSON format** with consistent structure
- ✅ **Timezone**: Singapore Time (UTC+8)

**Sample Station Locations:**
- Ang Mo Kio (1.3764, 103.8492)
- Sentosa (1.25, 103.8279)
- Pulau Ubin (1.4168, 103.9673)
- Tuas South (1.29377, 103.61843)

---

## Development Phases

### Phase 1: Project Initialization (1 day)

#### 1.1 Frontend Setup
```bash
pnpm create vite@latest digitwin-frontend -- --template react-ts
cd digitwin-frontend
pnpm install three @react-three/fiber @react-three/drei zustand @tanstack/react-query tailwindcss
```

**Dependencies:**
```json
{
  "three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.92.0",
  "zustand": "^4.4.0",
  "@tanstack/react-query": "^5.17.0",
  "tailwindcss": "^3.4.0"
}
```

#### 1.2 Backend Setup
```bash
mkdir digitwin-backend && cd digitwin-backend
pnpm init
pnpm add fastify @fastify/websocket @fastify/cors prisma @prisma/client
```

**Dependencies:**
```json
{
  "fastify": "^4.25.0",
  "@fastify/websocket": "^9.0.0",
  "@fastify/cors": "^9.0.0",
  "prisma": "^5.8.0",
  "@prisma/client": "^5.8.0",
  "node-fetch": "^3.3.0"
}
```

---

### Phase 2: Data Preparation (1 day)

#### 2.1 Acquire Singapore Building Data
**Source**: Data.gov.sg
- Search for "Master Plan" or "Building" datasets
- Download GeoJSON (recommended: HDB Property Information)
- Alternative: OneMap API for building footprints

#### 2.2 Database Schema

```sql
-- Building table
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  name TEXT,
  geom GEOMETRY(Polygon, 4326),  -- WGS84
  height FLOAT,                   -- meters
  levels INT,                     -- number of floors
  type TEXT                       -- HDB/Commercial/Industrial
);

CREATE INDEX buildings_geom_idx ON buildings USING GIST(geom);

-- Environmental data table (cache NEA data)
CREATE TABLE environment_readings (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location GEOMETRY(Point, 4326),
  station_id TEXT,
  temperature FLOAT,
  wind_speed FLOAT,
  wind_direction FLOAT,  -- degrees 0-360
  pm25 FLOAT,
  psi FLOAT
);

CREATE INDEX env_timestamp_idx ON environment_readings(timestamp);
CREATE INDEX env_location_idx ON environment_readings USING GIST(location);
```

#### 2.3 Prisma Schema
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Building {
  id     Int     @id @default(autoincrement())
  name   String?
  height Float?
  levels Int?
  type   String?
  // geom field handled via raw SQL
}
```

---

### Phase 3: Backend Real-time Data Service (2 days)

#### 3.1 NEA Service Integration

```typescript
// services/neaService.ts
import fetch from 'node-fetch';

export class NEAService {
  private apiKey = process.env.NEA_API_KEY || '';
  private baseURL = 'https://api.data.gov.sg/v1/environment';

  async getWindData() {
    const [speedRes, directionRes] = await Promise.all([
      fetch(`${this.baseURL}/wind-speed`, {
        headers: { 'api-key': this.apiKey }
      }),
      fetch(`${this.baseURL}/wind-direction`, {
        headers: { 'api-key': this.apiKey }
      })
    ]);

    const speedData = await speedRes.json();
    const directionData = await directionRes.json();

    return this.mergeWindData(speedData, directionData);
  }

  async getPollutionData() {
    const res = await fetch(`${this.baseURL}/pm25`, {
      headers: { 'api-key': this.apiKey }
    });
    return res.json();
  }

  async getTemperatureData() {
    const res = await fetch(`${this.baseURL}/air-temperature`, {
      headers: { 'api-key': this.apiKey }
    });
    return res.json();
  }

  async getRainfallData() {
    const res = await fetch(`${this.baseURL}/rainfall`, {
      headers: { 'api-key': this.apiKey }
    });
    return res.json();
  }

  private mergeWindData(speed: any, direction: any) {
    // Merge speed and direction by station
    const stations = speed.items[0].readings.map((s: any) => {
      const dir = direction.items[0].readings.find(
        (d: any) => d.station_id === s.station_id
      );
      return {
        station_id: s.station_id,
        speed: s.value,
        direction: dir?.value || 0
      };
    });
    return stations;
  }
}
```

#### 3.2 WebSocket Service

```typescript
// server.ts
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { NEAService } from './services/neaService';

const fastify = Fastify({ logger: true });
const neaService = new NEAService();

fastify.register(websocket);

fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('Client connected');

    const interval = setInterval(async () => {
      try {
        const [wind, pollution, temperature, rainfall] = await Promise.all([
          neaService.getWindData(),
          neaService.getPollutionData(),
          neaService.getTemperatureData(),
          neaService.getRainfallData()
        ]);

        socket.send(JSON.stringify({
          type: 'environment_update',
          timestamp: new Date().toISOString(),
          data: { wind, pollution, temperature, rainfall }
        }));
      } catch (error) {
        console.error('Error fetching NEA data:', error);
      }
    }, 10000); // Push every 10 seconds

    socket.on('close', () => {
      clearInterval(interval);
      console.log('Client disconnected');
    });
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log('Server listening on port 3000');
});
```

---

### Phase 4: 3D City Rendering (2 days)

#### 4.1 Main Scene Component

```tsx
// components/CityScene.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BuildingLayer } from './BuildingLayer';
import { WindParticles } from './WindParticles';
import { PollutionHeatmap } from './PollutionHeatmap';

export function CityScene() {
  return (
    <div className="w-full h-screen relative">
      <Canvas camera={{ position: [0, 1000, 2000], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={1} />
        <BuildingLayer />
        <WindParticles />
        <OrbitControls />
      </Canvas>
      <PollutionHeatmap />
    </div>
  );
}
```

#### 4.2 Building Extrusion

```tsx
// components/BuildingLayer.tsx
import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';

async function fetchBuildings() {
  const res = await fetch('http://localhost:3000/api/buildings');
  return res.json();
}

export function BuildingLayer() {
  const { data: buildings } = useQuery(['buildings'], fetchBuildings);

  if (!buildings) return null;

  return (
    <group>
      {buildings.map((b: any) => {
        // Convert GeoJSON coordinates to planar coordinates
        // Singapore center: ~103.8°E, 1.35°N
        const coords = b.geom.coordinates[0].map(([lng, lat]: number[]) => ({
          x: (lng - 103.8) * 111320,  // degrees to meters (approx)
          y: (lat - 1.35) * 111320
        }));

        const shape = new THREE.Shape();
        shape.moveTo(coords[0].x, coords[0].y);
        coords.slice(1).forEach((c: any) => shape.lineTo(c.x, c.y));

        const height = b.height || b.levels * 3 || 15; // Estimate if missing

        return (
          <mesh key={b.id} position={[coords[0].x, height / 2, coords[0].y]}>
            <extrudeGeometry
              args={[shape, {
                depth: height,
                bevelEnabled: false
              }]}
            />
            <meshStandardMaterial color="#cccccc" />
          </mesh>
        );
      })}
    </group>
  );
}
```

---

### Phase 5: Wind Field Particle System (2 days)

```tsx
// components/WindParticles.tsx
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWebSocket } from '../hooks/useWebSocket';

export function WindParticles() {
  const { windData } = useWebSocket();
  const particlesRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>();

  useEffect(() => {
    const count = 10000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    // Initialize particle positions
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * 10000 - 5000;
      positions[i * 3 + 1] = Math.random() * 500 + 10; // Above ground
      positions[i * 3 + 2] = Math.random() * 10000 - 5000;
    }

    velocitiesRef.current = velocities;

    if (particlesRef.current) {
      const geometry = particlesRef.current.geometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }, []);

  useFrame(() => {
    if (!particlesRef.current || !windData || !velocitiesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const avgWind = calculateAverageWind(windData);
    const windAngle = avgWind.direction * Math.PI / 180;
    const windSpeed = avgWind.speed;

    for (let i = 0; i < positions.length / 3; i++) {
      // Update position based on wind
      positions[i * 3] += Math.sin(windAngle) * windSpeed * 0.1;
      positions[i * 3 + 2] += Math.cos(windAngle) * windSpeed * 0.1;

      // Boundary reset
      if (positions[i * 3] > 5000) positions[i * 3] = -5000;
      if (positions[i * 3] < -5000) positions[i * 3] = 5000;
      if (positions[i * 3 + 2] > 5000) positions[i * 3 + 2] = -5000;
      if (positions[i * 3 + 2] < -5000) positions[i * 3 + 2] = 5000;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry />
      <pointsMaterial
        size={2}
        color="#4FC3F7"
        transparent
        opacity={0.6}
        sizeAttenuation={true}
      />
    </points>
  );
}

function calculateAverageWind(windData: any[]) {
  const sum = windData.reduce((acc, curr) => ({
    speed: acc.speed + curr.speed,
    direction: acc.direction + curr.direction
  }), { speed: 0, direction: 0 });

  return {
    speed: sum.speed / windData.length,
    direction: sum.direction / windData.length
  };
}
```

---

### Phase 6: Pollution Heatmap (1-2 days)

```tsx
// components/PollutionHeatmap.tsx
import { useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function PollutionHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { pollution } = useWebSocket();

  useEffect(() => {
    if (!canvasRef.current || !pollution) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw pollution data with radial gradients
    pollution.readings.forEach((station: any) => {
      const { x, y } = worldToScreen(station.location);
      const value = station.pm25 || station.psi || 0;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 500);
      const color = getPM25Color(value);

      gradient.addColorStop(0, `${color}80`); // Semi-transparent
      gradient.addColorStop(1, `${color}00`); // Fully transparent

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 500, y - 500, 1000, 1000);
    });
  }, [pollution]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
}

function worldToScreen(location: { lat: number; lng: number }) {
  // Convert lat/lng to screen coordinates
  // This is a simplified projection
  const x = (location.lng - 103.8) * 10000 + window.innerWidth / 2;
  const y = (1.35 - location.lat) * 10000 + window.innerHeight / 2;
  return { x, y };
}

function getPM25Color(value: number): string {
  if (value < 12) return '#00E400';      // Good
  if (value < 35) return '#FFFF00';      // Moderate
  if (value < 55) return '#FF7E00';      // Unhealthy for sensitive
  if (value < 150) return '#FF0000';     // Unhealthy
  if (value < 250) return '#8F3F97';     // Very unhealthy
  return '#7E0023';                       // Hazardous
}
```

---

### Phase 7: WebSocket Hook

```tsx
// hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { useStore } from '../store/envStore';

export function useWebSocket(url: string = 'ws://localhost:3000/ws') {
  const [connected, setConnected] = useState(false);
  const updateEnvironment = useStore(state => state.updateEnvironment);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'environment_update') {
        updateEnvironment(message.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => ws.close();
  }, [url, updateEnvironment]);

  const envData = useStore(state => state.environment);

  return {
    connected,
    windData: envData?.wind || [],
    pollution: envData?.pollution || null,
    temperature: envData?.temperature || null,
    rainfall: envData?.rainfall || null
  };
}
```

```tsx
// store/envStore.ts
import { create } from 'zustand';

interface EnvironmentState {
  environment: any;
  updateEnvironment: (data: any) => void;
}

export const useStore = create<EnvironmentState>((set) => ({
  environment: null,
  updateEnvironment: (data) => set({ environment: data })
}));
```

---

## Data Flow Architecture

```
NEA API (10s polling)
  ↓
Backend Cache + WebSocket
  ↓
Frontend Zustand Store
  ↓
┌─────────────────────────────┐
│  Three.js 3D Scene          │
│  ├─ Building blocks (static)│
│  ├─ Wind particles (dynamic)│
│  ├─ Pollution heatmap (Canvas overlay) │
│  └─ Temperature markers (Sprite) │
└─────────────────────────────┘
```

---

## Data Source Security & Reliability

| Data Source | Security | Commercial License | API Stability |
|------------|----------|-------------------|---------------|
| Data.gov.sg | ✅ Government official | ✅ Singapore Open Data License | ⭐⭐⭐⭐⭐ |
| NEA API | ✅ NEA official | ✅ Free to use | ⭐⭐⭐⭐⭐ |
| OneMap | ✅ Government mapping service | ✅ Attribution required | ⭐⭐⭐⭐ |
| OpenStreetMap | ✅ Open community | ✅ ODbL License | ⭐⭐⭐⭐ |

---

## MVP Data Strategy

### ✅ Building Data Sources (VERIFIED)

**Option 1: URA Master Plan 2019 (Recommended)**
- **Dataset**: Master Plan 2019 Building Layer
- **URL**: https://data.gov.sg/datasets/d_e8e3249d4433845bdd8034ae44329d9e/view
- **Format**: GeoJSON (48.9 MB)
- **Content**: Building footprints for all buildings in Singapore
- **Height Data**: Separate layer "Building Height Control" available
- **License**: Singapore Open Data License
- **Status**: ✅ Available for immediate download

**Option 2: NUS Urban Analytics Lab - 3D HDB Dataset**
- **Dataset**: Complete 3D model of all ~12,000 HDB buildings
- **URL**: https://github.com/ualsg/hdb3d-code
- **Format**: GeoJSON 2D + 3D formats
- **Content**: HDB footprints + height + number of storeys + address
- **License**: Open data (attribution required: NUS UAL, HDB, OSM, OneMap)
- **Status**: ✅ Available on GitHub
- **Advantage**: Includes detailed height/storey information

**Recommended Approach:**
1. Use **URA Master Plan 2019** for complete city coverage (all building types)
2. Supplement with **NUS HDB dataset** for accurate HDB heights
3. Merge datasets in PostGIS using spatial joins

### ✅ Real-time Environment Data

**All APIs tested and functional (2025-10-05):**
1. **Temperature**: 12 stations, per-minute updates, with coordinates
2. **Wind Speed/Direction**: 13 stations, per-minute updates
3. **PM2.5**: 5 regional readings, hourly updates
4. **PSI**: 5 regional readings, hourly updates
5. **Rainfall**: 54 stations, 5-minute updates

**Implementation:**
- Backend polls NEA API every 10-30 seconds
- WebSocket pushes updates to frontend
- No API key required (rate limits from Nov 2025)

### ⏸️ Deferred Features
3. **Weather Forecast**: NEA Forecast API (24-hour forecast) - **Phase 2**
4. **Scenario Simulation**: Frontend input parameters + algorithm calculation - **Phase 2**

---

## Priority Adjustment

### Must Have ✅
1. Basic 3D city rendering (building extrusion)
2. Real-time sensor data WebSocket push
3. Simple weather data display
4. Wind field particle animation
5. Pollution heatmap

### Nice to Have 🔶
6. Temperature field interpolation
7. Rainfall particle effect
8. Timeline playback
9. Multiple layer management

### Future Enhancement ⚡
10. AI prediction model deep integration
11. Collaborative editing / multi-user
12. Advanced scenario simulation

---

## Timeline Estimate

- **Phase 1**: 1 day (Project initialization)
- **Phase 2**: 1 day (Data preparation)
- **Phase 3**: 2 days (Backend services)
- **Phase 4**: 2 days (3D rendering)
- **Phase 5**: 2 days (Wind particles)
- **Phase 6**: 1-2 days (Pollution heatmap)
- **Phase 7**: Integration & testing (1 day)

**Total MVP**: ~2-3 weeks

---

## Deployment Strategy

### Frontend
- Vercel / Netlify / Self-hosted Nginx
- Environment variables: `VITE_WS_URL`, `VITE_API_URL`

### Backend
- Docker container + PM2
- Environment variables: `NEA_API_KEY`, `DATABASE_URL`

### Database
- Cloud PostgreSQL with PostGIS (AWS RDS / DigitalOcean)
- Or local Docker: `postgis/postgis:15-3.3`

---

## API Verification Summary (2025-10-05)

### ✅ All Critical APIs Verified Functional

**Real-time Environment APIs:**
```bash
# Base URL: https://api-open.data.gov.sg/v2/real-time/api/

✅ /air-temperature    # 12 stations, 30-33.6°C, per-minute
✅ /wind-speed         # 13 stations, 1.6-10.5 knots, per-minute
✅ /wind-direction     # 13 stations, 0-360°, per-minute
✅ /pm25               # 5 regions, 7-12 μg/m³, hourly
✅ /psi                # 5 regions, 44-56 index, hourly
✅ /rainfall           # 54 stations, mm, 5-minute intervals
```

**Building Geometry Data:**
```bash
✅ URA Master Plan 2019 Building Layer (48.9 MB GeoJSON)
   URL: https://data.gov.sg/datasets/d_e8e3249d4433845bdd8034ae44329d9e/view

✅ NUS HDB 3D Dataset (~12,000 buildings with height)
   URL: https://github.com/ualsg/hdb3d-code
```

**Key Findings:**
- ✅ No API authentication required (open access)
- ✅ All APIs return valid JSON with geographic coordinates
- ✅ Weather stations provide lat/lng for spatial interpolation
- ✅ Building datasets include sufficient data for 3D extrusion
- ⚠️ Rate limits coming November 2025 (register for API key recommended)

**Data Quality:**
- Temperature: 12 stations covering North/South/East/West/Central
- Wind: 13 stations with both speed (knots) and direction (degrees)
- Pollution: Regional aggregation (5 zones) suitable for heatmap
- Rainfall: Excellent coverage with 54 stations across Singapore

---

## Next Steps

1. ✅ Validate NEA API accessibility - **COMPLETED**
2. ✅ Find Singapore building dataset on Data.gov.sg - **COMPLETED**
3. ⏭️ Create project structure (frontend + backend)
4. ⏭️ Start Phase 1 implementation
