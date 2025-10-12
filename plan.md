# Singapore Digital Twin Platform - Development Plan

## 📋 Overview

This document outlines the complete development plan for:
1. **Go Backend Rewrite** (Phase A): Migrate from Node.js to Go with Gin framework
2. **3D Performance Optimization** (Phase B): Optimize building model loading and rendering

---

# 🔷 Phase A: Go Backend Rewrite (11.5 days)

## 🎯 Objectives

- Migrate backend from Node.js/Express to Go/Gin
- Implement high-performance RESTful API
- Import all data (buildings, streamlines, map textures) to PostgreSQL
- Add Redis caching layer
- Support WebSocket for real-time data streaming
- Deploy with Docker

## 📊 Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Language** | Go | 1.23+ |
| **Web Framework** | Gin | 1.10+ |
| **ORM** | GORM | 2.x |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **Logger** | Zap | 1.x |
| **WebSocket** | Gorilla WebSocket | 1.x |
| **Documentation** | Swagger | - |
| **Deployment** | Docker | - |

## 📅 Timeline

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| **1. Environment Setup** | 0.5 day | Install Go, initialize project, configure dependencies | go.mod, .env, Makefile |
| **2. Project Structure** | 0.5 day | Create directories, configuration files | Complete folder structure |
| **3. Database Layer** | 1.5 days | Define models, database connections, repositories | models/, repositories/ |
| **4. Business Logic Layer** | 1 day | Implement service layer | services/ |
| **5. API Layer** | 1.5 days | Gin handlers, routing, middleware | handlers/, router/ |
| **6. Data Migration** | 2 days | Write import scripts, populate database | scripts/, populated DB |
| **7. Advanced Features** | 2 days | WebSocket, logging, caching optimization | WebSocket service |
| **8. Testing** | 1.5 days | Unit tests, integration tests | tests/ |
| **9. Deployment** | 1 day | Dockerfile, docker-compose, documentation | Docker image, README |
| **Total** | **11.5 days** | - | **Production-ready Go backend** |

## 🏗️ Architecture Design

### Directory Structure

```
digitwin-backend-go/
├── cmd/
│   └── server/
│       └── main.go                    # Application entry point
│
├── internal/                          # Private application code
│   ├── config/
│   │   └── config.go                  # Configuration loader (Viper)
│   │
│   ├── database/
│   │   ├── postgres.go                # PostgreSQL connection pool
│   │   └── redis.go                   # Redis connection
│   │
│   ├── models/                        # GORM data models
│   │   ├── planning_area.go           # Planning area model
│   │   ├── building.go                # Building model
│   │   ├── wind_streamline.go         # Wind streamline model
│   │   └── map_texture.go             # Map texture model
│   │
│   ├── repositories/                  # Data access layer
│   │   ├── area_repository.go         # Area data access
│   │   ├── building_repository.go     # Building data access + cache
│   │   ├── streamline_repository.go   # Streamline data access
│   │   └── map_texture_repository.go  # Map texture data access
│   │
│   ├── services/                      # Business logic layer
│   │   ├── area_service.go            # Area business logic
│   │   ├── building_service.go        # Building business logic
│   │   ├── streamline_service.go      # Streamline business logic
│   │   └── websocket_service.go       # WebSocket service
│   │
│   ├── handlers/                      # Gin HTTP handlers
│   │   ├── area_handler.go            # Area endpoints
│   │   ├── building_handler.go        # Building endpoints
│   │   ├── streamline_handler.go      # Streamline endpoints
│   │   ├── map_texture_handler.go     # Map texture endpoints
│   │   ├── health_handler.go          # Health check
│   │   └── websocket_handler.go       # WebSocket handler
│   │
│   ├── middleware/                    # Gin middleware
│   │   ├── cors.go                    # CORS configuration
│   │   ├── logger.go                  # Request logging
│   │   ├── error_handler.go           # Error handling
│   │   └── rate_limiter.go            # Rate limiting
│   │
│   └── router/
│       └── router.go                  # Route configuration
│
├── pkg/                               # Public reusable packages
│   ├── response/
│   │   └── json.go                    # Unified JSON response
│   └── errors/
│       └── errors.go                  # Custom error types
│
├── scripts/                           # Utility scripts
│   ├── migrate/
│   │   └── main.go                    # Database migration
│   ├── import_areas/
│   │   └── main.go                    # Import planning areas
│   ├── import_buildings/
│   │   └── main.go                    # Import buildings (batch insert)
│   └── import_streamlines/
│       └── main.go                    # Import wind streamlines
│
├── static/                            # Static files
│   └── map-textures/                  # PNG texture files
│
├── tests/
│   ├── integration/                   # Integration tests
│   │   └── api_test.go
│   └── unit/                          # Unit tests
│       ├── repository_test.go
│       └── service_test.go
│
├── docs/                              # Swagger API documentation
│   └── swagger.json
│
├── .air.toml                          # Hot reload configuration
├── .env                               # Environment variables
├── .gitignore
├── Dockerfile                         # Multi-stage Docker build
├── docker-compose.yml                 # Docker compose for local dev
├── Makefile                          # Common commands
├── go.mod
├── go.sum
└── README.md
```

### Layered Architecture

```
Client Request
    ↓
Gin Router (CORS, Logger, Recovery, RateLimiter)
    ↓
Handler (Parameter validation, Response formatting)
    ↓
Service (Business logic, Error handling)
    ↓
Repository (Data access, Redis caching)
    ↓
Database (PostgreSQL + Redis)
```

## 🗄️ Data Models

### 1. PlanningArea
```go
type PlanningArea struct {
    ID           string    // Primary key (e.g., "choa-chu-kang")
    Name         string    // Display name
    Region       string    // "central", "north", "south", "east", "west"
    CenterLat    float64   // Center latitude
    CenterLng    float64   // Center longitude
    BoundsMinLat float64   // Bounding box
    BoundsMinLng float64
    BoundsMaxLat float64
    BoundsMaxLng float64
    CreatedAt    time.Time
    UpdatedAt    time.Time

    // Relations
    Buildings       []Building
    WindStreamlines []WindStreamline
    MapTexture      *MapTexture
}
```

### 2. Building
```go
type Building struct {
    ID             uint      // Auto-increment primary key
    PlanningAreaID string    // Foreign key
    Footprint      []Point2D // JSONB array of 2D points
    Height         float64   // Building height in meters
    BuildingType   *string   // Optional: "residential", "commercial", etc.
    Levels         *int      // Optional: number of floors
    Source         string    // "OpenStreetMap"
    FetchedAt      time.Time
    CreatedAt      time.Time
}

type Point2D struct {
    X float64 `json:"x"`
    Z float64 `json:"z"`
}
```

### 3. WindStreamline
```go
type WindStreamline struct {
    ID             uint      // Auto-increment primary key
    PlanningAreaID string    // Foreign key
    Direction      string    // "N", "NE", "E", "SE", "S", "SW", "W", "NW"
    Points         []Point3D // JSONB array of 3D points
    CreatedAt      time.Time
}

type Point3D struct {
    X float64 `json:"x"`
    Y float64 `json:"y"`
    Z float64 `json:"z"`
}
```

### 4. MapTexture
```go
type MapTexture struct {
    ID             uint      // Auto-increment primary key
    PlanningAreaID string    // Foreign key (unique)
    PNGFilePath    string    // e.g., "map-textures/choa-chu-kang.png"
    BoundsMinLat   float64
    BoundsMinLng   float64
    BoundsMaxLat   float64
    BoundsMaxLng   float64
    CenterLat      float64
    CenterLng      float64
    Zoom           int       // Default: 14
    Width          int       // Default: 2048
    Height         int       // Default: 2048
    CreatedAt      time.Time
}
```

## 🌐 API Design

### Core Endpoints

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| GET | `/health` | Health check (DB + Redis status) | No |
| GET | `/api/areas` | List all planning areas | 1 hour |
| GET | `/api/areas/:id` | Get single area details | 1 hour |
| GET | `/api/buildings/:id` | Get all buildings for area | 1 hour |
| GET | `/api/buildings/:id/chunks` | Get chunk info (for streaming) | 1 hour |
| GET | `/api/buildings/:id/chunk/:chunkId` | Get specific chunk (100 buildings) | 1 hour |
| GET | `/api/streamlines/:id` | Get wind streamlines for area | 1 hour |
| GET | `/api/map-textures/:id` | Get map texture metadata | 1 hour |
| GET | `/ws` | WebSocket for real-time data | - |
| GET | `/swagger/*` | Swagger API documentation | - |
| GET | `/static/*` | Static file serving | - |

### Unified Response Format

**Success:**
```json
{
  "success": true,
  "data": {
    "planningArea": "choa-chu-kang",
    "count": 1632,
    "buildings": [...]
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "No buildings found for area: invalid-area-id"
}
```

## 📦 Data Migration Strategy

### Import Workflow

```bash
# 1. Create database tables
make migrate

# 2. Import planning areas (from code constants)
make import-areas

# 3. Import buildings (~100K buildings from 55 JSON files)
make import-buildings

# 4. Import wind streamlines (~74K streamlines from 55 JSON files)
make import-streamlines

# 5. Import map texture metadata (from 55 JSON files)
make import-textures

# All-in-one command
make import-all
```

### Performance Optimizations

- Batch insert (1000 records per batch)
- Use transactions
- Disable indexes during import, rebuild after
- Expected import time: **5-10 minutes**

### Data Volume

| Data Type | Count | Size | Source |
|-----------|-------|------|--------|
| Planning Areas | 55 | ~10 KB | Code constants |
| Buildings | ~100,000 | 111 MB | JSON files |
| Wind Streamlines | ~74,000 | 430 MB | JSON files |
| Map Textures | 55 | 64 MB | PNG + JSON metadata |
| **Total** | - | **~605 MB** | - |

## 🔧 Key Technical Features

### 1. JSONB Storage

Store complex structures in PostgreSQL JSONB:

```go
// Implement custom Scan() and Value() for GORM
type Footprint []Point2D

func (f *Footprint) Scan(value interface{}) error {
    bytes, _ := value.([]byte)
    return json.Unmarshal(bytes, f)
}

func (f Footprint) Value() (driver.Value, error) {
    return json.Marshal(f)
}
```

### 2. Redis Caching Strategy

```go
// Cache key format
buildings:{area_id}       // TTL: 1 hour
streamlines:{area_id}     // TTL: 1 hour
areas:all                 // TTL: 1 hour
```

**Cache Flow:**
```
1. Check Redis cache
2. If hit → return cached data
3. If miss → query PostgreSQL → cache result → return
```

### 3. Middleware Stack

```
HTTP Request
  → CORS (allow cross-origin)
  → Logger (structured logging with Zap)
  → Recovery (panic recovery)
  → RateLimiter (100 requests/min per IP)
  → Handler
  → Response
```

### 4. WebSocket Streaming

```go
// Push environment data every 5 seconds
{
  "type": "environment_update",
  "timestamp": "2025-10-12T10:30:00Z",
  "data": {
    "temperature": {...},
    "wind": {...},
    "pollution": {...}
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
- Repository layer: Mock GORM
- Service layer: Mock Repository
- Target coverage: **70%+**

### Integration Tests
- Use `httptest` to test Gin handlers
- Test real database connections
- Test cache logic

### Performance Tests
- Use `wrk` or `ab` for benchmarking
- Target: **10K+ QPS** (single instance)

## 📊 Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| **Response Time (cached)** | < 50ms | Redis cache hit |
| **Response Time (DB query)** | < 200ms | PostgreSQL query |
| **Throughput** | 10K+ QPS | Single instance |
| **Memory Usage** | 50-100 MB | Idle state |
| **Startup Time** | < 1 second | Binary startup |
| **Docker Image Size** | < 30 MB | Alpine base image |

## 🚀 Development Workflow

### Local Development

```bash
# 1. Start dependencies
docker-compose up -d postgres redis

# 2. Run development server (hot reload)
make run

# 3. Access services
# API: http://localhost:3000
# Health: http://localhost:3000/health
# Swagger: http://localhost:3000/swagger/index.html
```

### Production Deployment

```bash
# 1. Build Docker image
make docker-build

# 2. Start all services
docker-compose up -d

# 3. Import data
docker-compose exec backend make import-all

# 4. Check health
curl http://localhost:3000/health
```

## 📝 Deliverables

### Code
- ✅ ~50 Go source files
- ✅ 8+ RESTful API endpoints
- ✅ WebSocket real-time streaming
- ✅ Swagger API documentation
- ✅ Comprehensive error handling
- ✅ Structured logging

### Data
- ✅ PostgreSQL database (all data imported)
- ✅ Redis cache configuration
- ✅ 55 planning areas
- ✅ ~100,000 buildings
- ✅ ~74,000 wind streamlines
- ✅ 55 map textures

### Documentation
- ✅ README.md (quick start guide)
- ✅ API documentation (Swagger)
- ✅ Architecture design document
- ✅ Deployment guide

### Deployment
- ✅ Dockerfile (multi-stage build)
- ✅ docker-compose.yml
- ✅ Makefile (automation commands)
- ✅ .air.toml (development hot reload)

## 🎯 Milestones

### Week 1 (Day 1-5)
- ✅ Complete Phase 1-5 (environment + code skeleton)
- ✅ API can return mock data
- ✅ Swagger documentation accessible

### Week 2 (Day 6-10)
- ✅ Complete Phase 6-7 (data import + advanced features)
- ✅ All APIs return real data
- ✅ WebSocket streaming works

### Week 3 (Day 11-15)
- ✅ Complete Phase 8-9 (testing + deployment)
- ✅ Docker deployment successful
- ✅ All tests passing
- ✅ Documentation complete

---

# 🔷 Phase B: 3D Building Performance Optimization (1-2 days)

## 🎯 Objectives

- Reduce initial loading time from 5-7 seconds to < 1 second
- Improve rendering FPS from 20 to 60
- Implement progressive loading for better UX
- Optimize both frontend rendering and backend data delivery

## 📊 Current Performance Issues

### Problem Analysis

```
Current State (Choa Chu Kang example):
- JSON file size: 2.3 MB (1,632 buildings)
- Bedok (largest): 8.9 MB (4,000+ buildings)

Loading Flow:
1. Download full JSON (2-9 MB)           → 1-3 seconds (slow network)
2. JSON.parse()                          → 200-500ms (large files)
3. React render 1600+ <mesh> components  → 500-1000ms
4. Three.js create 1600+ Geometries      → 1-2 seconds
5. GPU rendering                         → Continuous performance cost
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Time: 5-7 seconds + stuttering ❌
FPS: 15-25 (choppy) ❌
```

## 💡 Optimization Strategy

### Strategy Matrix

| Optimization | Frontend | Backend | Benefit | Difficulty |
|--------------|----------|---------|---------|------------|
| **1. Geometry Merging** | ✅ | - | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **2. LOD System** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **3. Frustum Culling** | ✅ | - | ⭐⭐⭐⭐ | ⭐⭐ |
| **4. Data Compression** | - | ✅ | ⭐⭐⭐⭐ | ⭐ |
| **5. Chunked Streaming** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **6. Web Worker Parsing** | ✅ | - | ⭐⭐⭐ | ⭐⭐⭐ |
| **7. IndexedDB Cache** | ✅ | - | ⭐⭐⭐ | ⭐⭐ |
| **8. Simplified Geometry** | ✅ | ✅ | ⭐⭐⭐ | ⭐⭐ |

## 🔧 Optimization Details

### 1. Geometry Merging + Instancing ⭐⭐⭐⭐⭐

**Concept:**
Merge 1,600 individual meshes into 3-5 merged geometries

**Performance Impact:**
```
Before: 1,600 draw calls → High GPU load
After:  3-5 draw calls   → GPU load reduced by 99%

Rendering: 20 FPS → 60 FPS ✅
Load time: -40% (fewer object creations)
```

**Implementation Approach:**
- Group buildings by height (low/medium/high)
- Merge geometries within each group using `mergeBufferGeometries`
- Render 3 merged meshes instead of 1600+ individual meshes
- Disable bevels for performance

### 2. LOD (Level of Detail) System ⭐⭐⭐⭐⭐

**Concept:**
Display different detail levels based on camera distance

**Three LOD Levels:**
```
LOD 0 (> 2000m):  Simple boxes
LOD 1 (500-2000m): Simplified footprints (50% vertices)
LOD 2 (< 500m):   Full detail
```

**Performance Impact:**
```
Far distance:  1000 simple boxes (not 1600 complex buildings)
Mid distance:  Simplified versions (50% fewer vertices)
Near distance: Full detail

Overall: 60-70% performance improvement ✅
```

### 3. Frustum Culling ⭐⭐⭐⭐

**Concept:**
Only render buildings visible in camera viewport

**Performance Impact:**
```
Typically only 30-40% of buildings are visible
Render count: 1600 → 500-600
Performance gain: 40-50% ✅
```

### 4. Backend Data Compression (Gzip) ⭐⭐⭐⭐

**Concept:**
Enable gzip compression on backend API responses

**Performance Impact:**
```
Before: 2.3 MB JSON
After:  200-400 KB (80-85% compression)
Download time: 2-3 seconds → 0.3-0.5 seconds ✅
```

**Backend Implementation (Go Gin):**
```go
import "github.com/gin-contrib/gzip"

func Setup(r *gin.Engine, h *Handlers) {
    // Add gzip middleware
    r.Use(gzip.Gzip(gzip.DefaultCompression))

    // ... rest of configuration
}
```

### 5. Chunked Streaming Loading ⭐⭐⭐⭐⭐ (Best UX)

**Concept:**
Load buildings in chunks (100-200 per chunk) for progressive rendering

**API Design:**

```
GET /api/buildings/:areaId/chunks
Response:
{
  "totalChunks": 16,
  "chunkSize": 100,
  "totalCount": 1632
}

GET /api/buildings/:areaId/chunk/:chunkId
Response:
{
  "chunkId": 0,
  "buildings": [...100 buildings...]
}
```

**Backend Implementation (Go):**
```go
// Get chunk metadata
func (r *BuildingRepository) GetChunkInfo(ctx context.Context, areaID string) (*ChunkInfo, error) {
    var count int64
    r.db.Model(&models.Building{}).
        Where("planning_area_id = ?", areaID).
        Count(&count)

    return &ChunkInfo{
        TotalChunks: int(math.Ceil(float64(count) / 100)),
        ChunkSize:   100,
        TotalCount:  int(count),
    }, nil
}

// Get specific chunk
func (r *BuildingRepository) GetChunk(ctx context.Context, areaID string, chunkID int) ([]models.Building, error) {
    var buildings []models.Building
    err := r.db.Where("planning_area_id = ?", areaID).
        Offset(chunkID * 100).
        Limit(100).
        Find(&buildings).Error
    return buildings, err
}
```

**Performance Impact:**
```
Before: Wait 3-7 seconds → Sudden display of all buildings
After:  0.5 seconds to show first 100 → Progressive loading

First paint: 3-7 seconds → 0.5 seconds ✅✅✅
User experience: Much better (progressive rendering)
```

### 6. Simplified Geometry (Backend Preprocessing) ⭐⭐⭐

**Concept:**
Simplify building footprints during data import using Douglas-Peucker algorithm

**API Support:**
```
GET /api/buildings/:id?lod=low     // Simplified (tolerance=5m)
GET /api/buildings/:id?lod=medium  // Standard (tolerance=2m)
GET /api/buildings/:id?lod=high    // Full detail (tolerance=0.5m)
```

**Backend Implementation:**
- Use Douglas-Peucker algorithm to reduce polygon vertices
- Store multiple LOD versions or generate on-demand
- Frontend selects appropriate LOD based on zoom level

### 7. Web Worker JSON Parsing ⭐⭐⭐

**Concept:**
Parse large JSON files in a Web Worker to avoid blocking main thread

**Performance Impact:**
```
Main thread stays responsive during parsing
No UI freezing during data loading
```

### 8. IndexedDB Caching ⭐⭐⭐

**Concept:**
Cache building data in browser IndexedDB for instant second visits

**Performance Impact:**
```
First visit:  1-2 seconds (network + parse)
Second visit: < 100ms (from IndexedDB)
```

## 📊 Implementation Priority

### Priority 1: Must Implement ⭐⭐⭐⭐⭐

| Optimization | Difficulty | Performance Gain | Time Required |
|--------------|-----------|------------------|---------------|
| **Geometry Merging** | ⭐⭐⭐ | 80-90% | 2 hours |
| **Backend Gzip** | ⭐ | 80% bandwidth | 30 minutes |
| **Frustum Culling** | ⭐⭐ | 40-50% | 1 hour |

**Total Impact:** Load time **7s → 1.5s**, FPS **20 → 60**

### Priority 2: Recommended ⭐⭐⭐⭐

| Optimization | Difficulty | Performance Gain | Time Required |
|--------------|-----------|------------------|---------------|
| **LOD System** | ⭐⭐⭐⭐ | 60-70% | 4 hours |
| **Chunked Loading** | ⭐⭐⭐⭐ | First paint 80% faster | 6 hours |

**Total Impact:** First paint **0.5s**, complete load **1s**

### Priority 3: Nice to Have ⭐⭐⭐

| Optimization | Difficulty | Performance Gain | Time Required |
|--------------|-----------|------------------|---------------|
| **Web Worker** | ⭐⭐⭐ | No main thread blocking | 3 hours |
| **IndexedDB Cache** | ⭐⭐ | 0 network on revisit | 2 hours |

## 🎯 Performance Targets

```
┌─────────────────────────────────────────────────┐
│ Before Optimization                              │
├─────────────────────────────────────────────────┤
│ Download time:    2-3 seconds                    │
│ Parse time:       0.5 seconds                    │
│ Render time:      2-4 seconds                    │
│ Total time:       5-7 seconds ❌                 │
│ FPS:              15-25 (choppy) ❌              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ After Priority 1 Optimizations                   │
├─────────────────────────────────────────────────┤
│ Download time:    0.3 seconds (gzip)             │
│ Parse time:       0.2 seconds                    │
│ Render time:      0.5 seconds (merged geometry)  │
│ Total time:       1-1.5 seconds ✅               │
│ FPS:              55-60 (smooth) ✅              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ After Priority 1+2 Optimizations                 │
├─────────────────────────────────────────────────┤
│ First paint:      0.5 seconds (chunked) ✅✅      │
│ Complete load:    1 second                       │
│ FPS:              60 (always smooth) ✅✅         │
└─────────────────────────────────────────────────┘
```

## 📅 Implementation Timeline

### Option A: Quick Win (2-3 hours)
```
1. Backend gzip compression (30 min)
2. Frontend geometry merging (2 hours)

Result: 7s → 1.5s ✅
```

### Option B: Best Experience (1-2 days)
```
1. Backend gzip + chunked API (4 hours)
2. Frontend geometry merging + LOD + frustum culling (1 day)

Result: First paint 0.5s, silky 60 FPS ✅✅
```

## 📝 Deliverables

### Backend Changes
- ✅ Gzip compression middleware
- ✅ Chunked loading API endpoints (`/chunks` and `/chunk/:id`)
- ✅ LOD query parameter support (optional)
- ✅ Simplified geometry preprocessing (optional)

### Frontend Changes
- ✅ Geometry merging implementation
- ✅ LOD system with distance-based switching
- ✅ Frustum culling
- ✅ Chunked progressive loading
- ✅ Loading progress indicators
- ✅ Web Worker for JSON parsing (optional)
- ✅ IndexedDB caching (optional)

### Documentation
- ✅ Performance optimization guide
- ✅ Before/after metrics
- ✅ API usage examples

---

## 📋 Project Execution Order

1. **Phase A: Go Backend (11.5 days)** - Complete backend migration first
2. **Phase B: 3D Optimization (1-2 days)** - Then optimize frontend performance

**Total Project Duration: 12.5-13.5 days**

---

## 🚀 Getting Started

See individual phase sections above for detailed implementation steps.

**Questions or need clarification?** Update this document as development progresses.
