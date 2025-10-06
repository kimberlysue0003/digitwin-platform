#!/bin/bash
# DigiTwin Backend Deployment Script for EC2

echo "🚀 DigiTwin Backend Deployment"
echo "================================"

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ubuntu
    echo "✅ Docker installed"
fi

# Clone or update repository
if [ -d "digitwin-platform" ]; then
    echo "🔄 Updating repository..."
    cd digitwin-platform
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/kimberlysue0003/digitwin-platform.git
    cd digitwin-platform
fi

# Navigate to backend
cd digitwin-backend

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?schema=public
PORT=3000
NODE_ENV=production
EOF

echo ""
echo "⚠️  IMPORTANT: Edit the .env file and replace YOUR_RDS_PASSWORD with your actual RDS password"
echo ""
echo "Run these commands:"
echo "  nano .env"
echo "  # Replace YOUR_RDS_PASSWORD with your actual password, then save (Ctrl+X, Y, Enter)"
echo ""
echo "Then run:"
echo "  sudo docker-compose up -d --build"
echo ""
echo "✅ Setup complete!"
