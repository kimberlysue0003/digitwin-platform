# Digital Twin Backend - Go Implementation

High-performance backend API for Singapore Digital Twin Platform built with Go and Gin.

## Tech Stack

- **Framework**: Gin v1.10+
- **ORM**: GORM v2
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Logger**: Zap
- **WebSocket**: Gorilla WebSocket

## Quick Start

### Prerequisites

- Go 1.23+
- PostgreSQL 16
- Redis 7
- Docker (optional)

### Local Development

```bash
# Install dependencies
go mod download

# Start dependencies (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Run with hot reload
make run

# Or run directly
go run cmd/server/main.go
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:digitwin123@localhost:5432/digitwin?sslmode=disable
REDIS_URL=redis://localhost:6379/0
PORT=3000
ENV=development
LOG_LEVEL=debug
```

## Project Structure

```
digitwin-backend-go/
├── cmd/server/main.go          # Application entry point
├── internal/                   # Private application code
│   ├── config/                 # Configuration
│   ├── database/               # Database connections
│   ├── models/                 # GORM models
│   ├── repositories/           # Data access layer
│   ├── services/               # Business logic
│   ├── handlers/               # HTTP handlers
│   ├── middleware/             # Middleware
│   └── router/                 # Route configuration
├── pkg/                        # Public packages
│   ├── response/               # Response helpers
│   └── errors/                 # Error types
├── scripts/                    # Data import scripts
├── static/                     # Static files
└── tests/                      # Tests
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/areas` | List all planning areas |
| GET | `/api/areas/:id` | Get area details |
| GET | `/api/buildings/:id` | Get buildings for area |
| GET | `/api/buildings/:id/chunks` | Get chunk info |
| GET | `/api/buildings/:id/chunk/:chunkId` | Get building chunk |
| GET | `/api/streamlines/:id` | Get wind streamlines |
| GET | `/ws` | WebSocket endpoint |
| GET | `/swagger/*` | API documentation |

## Development

```bash
# Run tests
make test

# Build binary
make build

# Generate Swagger docs
make swagger

# Import data
make import-all
```

## Docker Deployment

```bash
# Build image
docker build -t digitwin-backend-go .

# Run container
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  digitwin-backend-go
```

## Performance

- Response time: < 50ms (cached)
- Throughput: 10K+ QPS
- Memory usage: 50-100 MB
- Docker image: < 30 MB

## License

MIT
