# DigitWin Backend (Go + Gin)

High-performance backend API for DigitWin digital twin platform, built with Go 1.23+ and Gin framework.

## Features

- 🚀 **High Performance**: Go's native concurrency, 10K+ QPS capability
- 📦 **PostgreSQL + Redis**: Robust data storage with caching layer
- 🔄 **Batch Processing**: Optimized bulk operations (1000 records/batch)
- 📊 **Chunked Loading**: Efficient large dataset delivery
- 🛡️ **Production Ready**: Health checks, graceful shutdown, rate limiting
- 📝 **Structured Logging**: Zap logger with JSON output
- 🎯 **RESTful API**: 23 endpoints across 4 resource types

## Tech Stack

- **Framework**: Gin v1.10+
- **ORM**: GORM v2 with PostgreSQL driver
- **Cache**: Redis v7
- **Logger**: Zap (structured logging)
- **WebSocket**: Gorilla WebSocket
- **Config**: godotenv (.env support)

## Project Structure

```
digitwin-backend-go/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/                  # Configuration loader
│   ├── database/                # Database connections (PostgreSQL, Redis)
│   ├── models/                  # GORM models (4 models)
│   ├── repositories/            # Data access layer (4 repos)
│   ├── services/                # Business logic (4 services)
│   ├── handlers/                # HTTP handlers (5 handlers)
│   ├── middleware/              # Gin middleware (5 middleware)
│   └── routes/                  # Route definitions
├── pkg/
│   ├── response/                # Unified JSON response
│   └── errors/                  # Custom error types
├── scripts/
│   ├── export_from_nodejs.js    # Export data from Node.js
│   ├── import/                  # Import scripts (4 importers)
│   ├── import_all.sh            # Bash import script
│   └── import_all.ps1           # PowerShell import script
├── .env.example                 # Environment template
├── docker-compose.yml           # Local development stack
├── Makefile                     # Build automation
└── README.md                    # This file
```

## Quick Start

### 1. Prerequisites

```bash
# Go 1.23+
go version

# PostgreSQL 16
psql --version

# Redis 7
redis-cli --version
```

### 2. Setup

```bash
# Clone and navigate
cd digitwin-backend-go

# Install dependencies
go mod download

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start dependencies (Docker)
docker-compose up -d postgres redis
```

### 3. Import Data

```bash
# Export from Node.js backend (generates mock data)
make export

# Import all data to PostgreSQL
make import-all

# Or import individually
make import-areas
make import-buildings
make import-streamlines
make import-map-textures
```

### 4. Run Server

```bash
# Development mode
make run

# With hot reload (requires air)
make dev

# Production build
make build
./bin/server
```

### 5. Test API

```bash
# Health check
curl http://localhost:8080/health

# Get all planning areas
curl http://localhost:8080/api/areas

# Get buildings for an area
curl http://localhost:8080/api/buildings/area-a-1

# Get chunk info (for progressive loading)
curl http://localhost:8080/api/buildings/area-a-1/chunks/info

# Get specific chunk
curl http://localhost:8080/api/buildings/area-a-1/chunks/0
```

## API Endpoints

### Planning Areas (6 endpoints)
- `GET /api/areas` - Get all areas
- `GET /api/areas/:id` - Get by ID
- `GET /api/areas/region/:region` - Filter by region
- `POST /api/areas` - Create new area
- `PUT /api/areas/:id` - Update area
- `DELETE /api/areas/:id` - Delete area

### Buildings (6 endpoints)
- `GET /api/buildings/:areaId` - Get all buildings
- `GET /api/buildings/:areaId/chunks/info` - Get chunk metadata
- `GET /api/buildings/:areaId/chunks/:chunkIndex` - Get chunk data
- `GET /api/buildings/:areaId/stats` - Get statistics
- `POST /api/buildings` - Batch create
- `DELETE /api/buildings/:areaId` - Delete all

### Wind Streamlines (5 endpoints)
- `GET /api/streamlines/:areaId?direction=N` - Filter by direction
- `GET /api/streamlines/:areaId/all` - Get all directions
- `GET /api/streamlines/:areaId/stats` - Get statistics
- `POST /api/streamlines` - Batch create
- `DELETE /api/streamlines/:areaId` - Delete all

### Map Textures (6 endpoints)
- `GET /api/map-textures/:areaId` - Get metadata
- `GET /api/map-textures/:areaId/file` - Download PNG
- `GET /api/map-textures/:areaId/validate` - Validate bounds
- `POST /api/map-textures` - Create entry
- `PUT /api/map-textures/:areaId` - Update entry
- `DELETE /api/map-textures/:areaId` - Delete entry

### Health (3 endpoints)
- `GET /health` - Full health check (DB + Redis)
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)

## Configuration

Environment variables (`.env`):

```env
# Server
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
GIN_MODE=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=digitwin
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application
STATIC_PATH=./static
LOG_LEVEL=info
```

## Performance Features

### Redis Caching
- 1-hour TTL for all cached data
- Automatic cache invalidation on updates
- Cache keys: `areas:all`, `buildings:{areaId}`, etc.

### Batch Operations
- Buildings: 1000 records/batch
- Streamlines: 500 records/batch
- Auto-chunking in repositories

### Connection Pooling
- PostgreSQL: 10 idle, 100 max connections
- Redis: Connection reuse with health checks

### Rate Limiting
- 1000 requests/minute per IP
- Automatic cleanup of old visitors

## Development

### Makefile Commands

```bash
make help              # Show all commands
make run               # Run server
make dev               # Hot reload (requires air)
make build             # Build binary
make test              # Run tests
make test-coverage     # Coverage report
make clean             # Clean artifacts
make export            # Export from Node.js
make import-all        # Import all data
make fmt               # Format code
make lint              # Run linter
```

### Project Dependencies

```bash
go get github.com/gin-gonic/gin
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
go get go.uber.org/zap
go get github.com/joho/godotenv
```

## Docker Support

```bash
# Start full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop stack
docker-compose down
```

## Production Deployment

### Build

```bash
make build
# Binary: ./bin/server
```

### Environment

- Set `GIN_MODE=release`
- Set `LOG_LEVEL=info` or `warn`
- Use strong database credentials
- Enable PostgreSQL SSL (`DB_SSLMODE=require`)

### Health Checks

- **Liveness**: `GET /live` (always returns 200)
- **Readiness**: `GET /ready` (checks DB + Redis)
- **Health**: `GET /health` (detailed status)

### Kubernetes Example

```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Architecture

### Layered Design

```
HTTP Request
    ↓
Middleware Chain (CORS → Logger → Recovery → Timeout → RateLimit)
    ↓
Handler Layer (HTTP → Service call)
    ↓
Service Layer (Business logic + Validation)
    ↓
Repository Layer (Database + Cache)
    ↓
Database (PostgreSQL + Redis)
```

### Data Flow Example

```
GET /api/buildings/area-a-1
    ↓
BuildingHandler.GetBuildingsByAreaID()
    ↓
BuildingService.GetBuildingsByAreaID() (validates area exists)
    ↓
BuildingRepository.GetByAreaID() (checks Redis cache)
    ↓
PostgreSQL (if cache miss)
    ↓
Cache result in Redis (1 hour)
    ↓
Return JSON response
```

## Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific package
go test -v ./internal/services/...
```

## License

MIT

## Author

DigitWin Team

