#!/bin/bash
# DigiTwin Backend Deployment Script for EC2

# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install PM2 for process management
sudo npm install -g pm2

# Clone or update repository
cd /home/ubuntu
if [ -d "digitwin-platform" ]; then
    cd digitwin-platform
    git pull origin main
else
    git clone https://github.com/kimberlysue0003/digitwin-platform.git
    cd digitwin-platform
fi

# Setup backend
cd digitwin-backend
npm install

# Create .env file (you'll need to edit this with your RDS credentials)
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/digitwin?schema=public"
PORT=3000
NODE_ENV=production
EOF

echo "⚠️  Please edit /home/ubuntu/digitwin-platform/digitwin-backend/.env with your RDS credentials"
echo ""
echo "After editing .env, run:"
echo "  npx prisma migrate deploy"
echo "  npx prisma generate"
echo "  npm run build"
echo "  pm2 start dist/index.js --name digitwin-backend"
echo "  pm2 save"
echo "  pm2 startup"
