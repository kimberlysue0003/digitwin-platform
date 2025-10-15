#!/bin/bash
# Fix Redis connection issue - run this on EC2

set -e

echo "=== Stopping existing containers ==="
docker stop digitwin-backend-go digitwin-redis 2>/dev/null || true
docker rm digitwin-backend-go digitwin-redis 2>/dev/null || true

echo "=== Creating deployment directory ==="
mkdir -p /opt/digitwin
cd /opt/digitwin

echo "=== Cloning/updating repository ==="
if [ -d "digitwin-platform" ]; then
    cd digitwin-platform
    git pull
else
    git clone https://github.com/kimberlysue0003/digitwin-platform.git
    cd digitwin-platform
fi

cd digitwin-backend-go

echo "=== Creating docker-compose override ==="
cat > docker-compose.override.yml << 'EOFINNER'
version: '3.8'

services:
  postgres:
    # Disable local postgres, use RDS instead
    profiles:
      - disabled

  backend:
    environment:
      DB_HOST: digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: 87Abc_0508
      DB_NAME: digitwin
      DB_SSLMODE: require
      REDIS_HOST: redis
      REDIS_PORT: 6379
      SERVER_PORT: 3000
      SERVER_HOST: 0.0.0.0
      GIN_MODE: release
    ports:
      - "3000:3000"
EOFINNER

echo "=== Starting services with docker-compose ==="
docker-compose up -d redis backend

echo "=== Waiting for services to start ==="
sleep 5

echo "=== Checking container status ==="
docker-compose ps

echo "=== Viewing backend logs ==="
docker-compose logs --tail 30 backend

echo ""
echo "=== Testing health endpoint ==="
curl http://localhost:3000/health || echo "Health check failed"

echo ""
echo "=== Setup complete! ==="
echo "View logs: docker-compose logs -f backend"
echo "Restart: docker-compose restart backend"
echo "Stop: docker-compose down"
