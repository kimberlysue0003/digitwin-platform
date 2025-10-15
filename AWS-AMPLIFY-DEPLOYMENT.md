# AWS Amplify + EC2 Deployment Guide
# 成本优化的 CI/CD 部署方案

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                    (Push to main)                        │
└──────────────────┬───────────────────┬──────────────────┘
                   │                   │
                   ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  GitHub Actions  │  │  AWS Amplify     │
        │  (Backend CI/CD) │  │  (Frontend CI/CD)│
        └─────────┬────────┘  └────────┬─────────┘
                  │                    │
                  ▼                    │
        ┌──────────────────┐           │
        │   Build & Test   │           │
        │   Docker Image   │           │
        └─────────┬────────┘           │
                  │                    │
                  ▼                    ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  AWS ECR         │  │  Amplify CDN     │
        │  (Docker Image)  │  │  (Static Files)  │
        └─────────┬────────┘  └────────┬─────────┘
                  │                    │
                  ▼                    │
        ┌──────────────────┐           │
        │   EC2 Instance   │◄──────────┘
        │   (Go Backend)   │  API Calls
        │   - Docker       │
        │   - Port 3000    │
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  RDS PostgreSQL  │
        │   (Database)     │
        └──────────────────┘
```

## 💡 Why This Architecture?

### 优势
- ✅ **低成本**: 月费用 ~$47-52 (与现有成本相当)
- ✅ **自动化 CI/CD**: 前端和后端都自动部署
- ✅ **Amplify 优势**:
  - 自动构建和部署
  - 全球 CDN 加速
  - HTTPS 自动配置
  - 预览环境（PR builds）
  - 零运维
- ✅ **利用现有资源**: RDS 和 EC2
- ✅ **简单可靠**: 不需要 ALB、ECS 等复杂服务

### 成本明细
```
EC2 t2.medium (24/7)       ~$30  ← 复用现有
RDS db.t3.micro            ~$15  ← 复用现有
Amplify Hosting            ~$0-5 (前 1000 分钟构建免费，15GB 存储免费)
ECR (Docker Registry)      ~$0.1
Data Transfer              ~$2
────────────────────────────────
总计:                      ~$47-52/月
```

## 📝 Prerequisites

1. **现有资源**:
   - ✅ EC2: `18.142.236.220`
   - ✅ RDS: `digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com`

2. **需要安装到 EC2**:
   - Docker
   - Docker Compose
   - Go 1.23+

3. **GitHub**:
   - 仓库管理权限
   - 能添加 Secrets

## 🚀 Step-by-Step Deployment

### Part 1: Setup EC2 for Go Backend with Docker

#### Step 1.1: SSH 到 EC2 并安装 Docker

```bash
# SSH to EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Logout and login again for docker group to take effect
exit
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# Verify Docker
docker --version

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### Step 1.2: Install Go (if not already installed)

```bash
# Download and install Go 1.23
wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
go version
```

#### Step 1.3: Create deployment directory

```bash
# Create directory for the app
sudo mkdir -p /opt/digitwin
sudo chown ubuntu:ubuntu /opt/digitwin
cd /opt/digitwin
```

### Part 2: Setup AWS ECR for Docker Images

```bash
# On your local machine
aws ecr create-repository \
  --repository-name digitwin-backend \
  --region ap-southeast-1 \
  --image-scanning-configuration scanOnPush=true

# Get the repository URI (save this!)
aws ecr describe-repositories \
  --repository-names digitwin-backend \
  --region ap-southeast-1 \
  --query 'repositories[0].repositoryUri' \
  --output text
```

### Part 3: Setup GitHub Actions for Backend

#### Step 3.1: Add GitHub Secrets

在 GitHub 仓库中添加以下 Secrets:

**Settings → Secrets and variables → Actions → New repository secret**

```
Name: AWS_ACCESS_KEY_ID
Value: <your-aws-access-key>

Name: AWS_SECRET_ACCESS_KEY
Value: <your-aws-secret-key>

Name: EC2_HOST
Value: 18.142.236.220

Name: EC2_USER
Value: ubuntu

Name: EC2_SSH_KEY
Value: <paste your ecommerce-key.pem content here>

Name: DATABASE_URL
Value: postgresql://postgres:YOUR_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require
```

#### Step 3.2: Create GitHub Actions Workflow

已创建在: `.github/workflows/backend-ec2-deploy.yml`

### Part 4: Setup AWS Amplify for Frontend

#### Step 4.1: Connect Repository to Amplify

1. 打开 [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. 点击 **New app** → **Host web app**
3. 选择 **GitHub**
4. 授权 AWS Amplify 访问你的仓库
5. 选择仓库: `kimberlysue0003/digitwin-platform`
6. 选择分支: `main`

#### Step 4.2: Configure Build Settings

Amplify 会自动检测到 Vite 项目，但需要配置：

**App root directory**: `digitwin-frontend`

**Build settings** (amplify.yml):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd digitwin-frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: digitwin-frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - digitwin-frontend/node_modules/**/*
```

#### Step 4.3: Add Environment Variables in Amplify

在 Amplify Console 中:

**App settings → Environment variables → Manage variables**

添加:
```
VITE_API_URL = http://18.142.236.220:3000/api
```

#### Step 4.4: Deploy

点击 **Save and deploy**

Amplify 会自动:
- ✅ 从 GitHub 拉取代码
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 部署到 CDN
- ✅ 生成 HTTPS URL

**部署完成后，你会得到一个 URL，类似：**
```
https://main.xxxxxx.amplifyapp.com
```

### Part 5: Create Backend Deployment Workflow

创建 GitHub Actions workflow 文件。

### Part 6: Test Complete Workflow

```bash
# 1. Make a small change to backend
cd digitwin-backend-go
echo "// Updated at $(date)" >> cmd/server/main.go

# 2. Commit and push
git add .
git commit -m "Test backend deployment"
git push origin main

# 3. Watch GitHub Actions
# Go to: https://github.com/kimberlysue0003/digitwin-platform/actions

# 4. Make a small change to frontend
cd ../digitwin-frontend
echo "/* Updated at $(date) */" >> src/App.tsx

# 5. Commit and push
git add .
git commit -m "Test frontend deployment"
git push origin main

# 6. Watch Amplify Console
# Go to: https://console.aws.amazon.com/amplify/
```

## 📊 Monitoring & Management

### Backend Logs (on EC2)

```bash
# SSH to EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# View logs
cd /opt/digitwin
docker-compose logs -f backend

# Check running containers
docker ps

# Restart backend
docker-compose restart backend

# Update manually (if needed)
docker-compose pull backend
docker-compose up -d
```

### Frontend (Amplify)

- **Amplify Console**: https://console.aws.amazon.com/amplify/
- **View builds**: App → Build history
- **View logs**: Click on any build → View logs
- **Access logs**: CloudWatch Logs

### Check Status

```bash
# Backend health
curl http://18.142.236.220:3000/health

# Frontend
curl https://main.xxxxxx.amplifyapp.com/health
```

## 🔧 Troubleshooting

### Backend Issues

#### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Remove old containers
docker-compose down
docker-compose up -d
```

#### Can't connect to database
```bash
# Test from EC2
docker run --rm postgres:16-alpine psql "postgresql://postgres:PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin" -c "SELECT 1"

# Check RDS security group
# Ensure EC2's security group is allowed
```

### Frontend Issues

#### Build fails in Amplify
- Check build logs in Amplify Console
- Verify environment variables are set
- Check `amplify.yml` configuration

#### API calls fail
- Verify VITE_API_URL environment variable
- Check CORS settings in backend
- Verify EC2 security group allows inbound on port 3000

## 🎨 Advanced Features

### Add Custom Domain to Amplify

1. Go to Amplify Console
2. **App settings → Domain management**
3. Click **Add domain**
4. Follow wizard to configure DNS

### Enable PR Previews

Amplify 自动为每个 Pull Request 创建预览环境！

### Add Redis Cache

```bash
# On EC2
cd /opt/digitwin

# Add to docker-compose.yml
# redis:
#   image: redis:7-alpine
#   ports:
#     - "6379:6379"

# Update backend environment
# REDIS_URL=redis://localhost:6379

docker-compose up -d
```

### Set up Monitoring

```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure metrics
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s
```

## 💰 Cost Optimization Tips

1. **Stop EC2 when not needed** (development)
   ```bash
   # Stop EC2
   aws ec2 stop-instances --instance-ids i-xxxxx

   # Start EC2
   aws ec2 start-instances --instance-ids i-xxxxx
   ```

2. **Use Amplify build time wisely**
   - First 1000 build minutes/month are free
   - Avoid unnecessary rebuilds

3. **Optimize Docker image**
   - Use multi-stage builds (already implemented)
   - Clean up old images regularly

4. **Monitor data transfer**
   - Most expensive part of AWS
   - Use CloudFront (Amplify includes this)

## 📚 Comparison with Other Options

| Feature | Current | Amplify+EC2 | ECS Fargate |
|---------|---------|-------------|-------------|
| Cost/month | $47 | $47-52 | $61-70 |
| CI/CD | ❌ | ✅ | ✅ |
| Auto-scaling | ❌ | ⚠️ (Manual) | ✅ |
| Zero-downtime deploy | ❌ | ⚠️ | ✅ |
| Complexity | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| Maintenance | ⭐⭐⭐ | ⭐⭐ | ⭐ |

## 🎯 Next Steps

1. ✅ Setup Docker on EC2
2. ✅ Create ECR repository
3. ✅ Configure GitHub Actions
4. ✅ Setup Amplify
5. ✅ Test deployment
6. 🔜 Add custom domain
7. 🔜 Setup monitoring
8. 🔜 Configure backups

---

**Created**: 2025-10-15
**Cost**: ~$47-52/month
**Deployment Time**: ~1 hour
**Recommended For**: Small to medium projects with predictable traffic
