# AWS ECS CI/CD Deployment Guide
# DigiTwin Platform - 完整部署指南

## 📋 Architecture Overview

```
┌─────────────────┐
│  GitHub Repo    │
│   (Push/PR)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │ ─── Build & Test
│    CI/CD        │ ─── Build Docker Images
└────────┬────────┘ ─── Push to ECR
         │           ─── Deploy to ECS
         ▼
┌─────────────────────────────────────┐
│         AWS Cloud                   │
│  ┌──────────────────────────────┐  │
│  │    Amazon ECR                │  │
│  │  - digitwin-backend:latest   │  │
│  │  - digitwin-frontend:latest  │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │    ECS Cluster (Fargate)     │  │
│  │  ┌────────────────────────┐  │  │
│  │  │  Backend Service       │  │  │
│  │  │  - Go API (Port 3000)  │──┼──┼─→ ALB
│  │  └────────────────────────┘  │  │
│  │  ┌────────────────────────┐  │  │
│  │  │  Frontend Service      │  │  │
│  │  │  - Nginx (Port 80)     │──┼──┼─→ ALB
│  │  └────────────────────────┘  │  │
│  └──────────────────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │    RDS PostgreSQL            │  │
│  │  (Existing Database)         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🛠️ Technology Stack

- **Container Orchestration**: AWS ECS Fargate
- **Container Registry**: AWS ECR
- **Database**: RDS PostgreSQL (existing)
- **Load Balancer**: Application Load Balancer (ALB)
- **CI/CD**: GitHub Actions
- **Secrets Management**: AWS Secrets Manager
- **Monitoring**: CloudWatch Logs

## 📝 Prerequisites

### 1. AWS Account & Permissions
确保你的 AWS 账户有以下权限：
- ECR: Full access
- ECS: Full access
- IAM: Create roles and policies
- VPC: Read access
- CloudWatch: Logs access
- Secrets Manager: Full access

### 2. Local Tools
```bash
# Install AWS CLI
# Windows (using Chocolatey)
choco install awscli

# Or download from: https://aws.amazon.com/cli/

# Verify installation
aws --version

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: ap-southeast-1
# - Default output format: json
```

### 3. GitHub Repository Secrets
在 GitHub 仓库设置中添加以下 secrets：

**Settings → Secrets and variables → Actions → New repository secret**

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
VITE_API_URL=http://your-alb-url.com/api
```

## 🚀 Step-by-Step Deployment

### Step 1: Setup AWS Resources

```bash
# Navigate to aws-setup directory
cd aws-setup

# Make script executable
chmod +x setup-aws-resources.sh

# Run setup script
./setup-aws-resources.sh
```

这个脚本会创建：
- ✅ ECR repositories (digitwin-backend, digitwin-frontend)
- ✅ ECS cluster (digitwin-cluster)
- ✅ CloudWatch log groups
- ✅ IAM roles (execution & task roles)
- ✅ Security groups
- ✅ Configuration file (aws-config.env)

**输出示例：**
```
========================================
DigiTwin Platform AWS Setup
========================================
AWS Account ID: 123456789012
Region: ap-southeast-1

[1/8] Creating ECR repositories...
Created ECR repository: digitwin-backend
Created ECR repository: digitwin-frontend

[2/8] Creating ECS cluster...
Created ECS cluster: digitwin-cluster

...

========================================
Setup Complete!
========================================
```

### Step 2: Store Secrets in AWS Secrets Manager

```bash
# Create database URL secret
aws secretsmanager create-secret \
  --name digitwin/database-url \
  --description "Database connection URL" \
  --secret-string "postgresql://postgres:YOUR_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require" \
  --region ap-southeast-1

# Create Redis URL secret (if using Redis)
aws secretsmanager create-secret \
  --name digitwin/redis-url \
  --description "Redis connection URL" \
  --secret-string "redis://your-redis-endpoint:6379/0" \
  --region ap-southeast-1
```

### Step 3: Update Task Definitions

从 `aws-setup/aws-config.env` 文件获取你的 AWS Account ID，然后更新：

#### Backend Task Definition
编辑 `digitwin-backend-go/task-definition.json`:

```json
{
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "image": "YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest",
  ...
}
```

#### Frontend Task Definition
编辑 `digitwin-frontend/task-definition.json` 同样的方式更新。

### Step 4: Create Application Load Balancer (ALB)

#### Option A: Using AWS Console

1. **进入 EC2 → Load Balancers → Create Load Balancer**
2. **选择 Application Load Balancer**
3. **Basic Configuration:**
   - Name: `digitwin-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4

4. **Network mapping:**
   - VPC: 选择默认 VPC
   - Subnets: 至少选择 2 个不同可用区的子网

5. **Security groups:**
   - 创建新的安全组或选择现有的
   - 允许入站：HTTP (80), HTTPS (443)

6. **Listeners and routing:**

   **Listener 1 - Frontend (HTTP:80)**
   - Protocol: HTTP
   - Port: 80
   - Default action: 创建 target group
     - Target type: IP
     - Name: `digitwin-frontend-tg`
     - Protocol: HTTP
     - Port: 80
     - Health check path: `/health`

   **Listener 2 - Backend (HTTP:3000)**
   - 创建 ALB 后添加新 listener
   - Protocol: HTTP
   - Port: 3000
   - Target group: 创建新的
     - Name: `digitwin-backend-tg`
     - Protocol: HTTP
     - Port: 3000
     - Health check path: `/health`

#### Option B: Using AWS CLI

```bash
# Load configuration
source aws-setup/aws-config.env

# Create target groups
aws elbv2 create-target-group \
  --name digitwin-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --region $AWS_REGION

aws elbv2 create-target-group \
  --name digitwin-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --region $AWS_REGION

# Create load balancer
aws elbv2 create-load-balancer \
  --name digitwin-alb \
  --subnets $SUBNET_IDS \
  --security-groups $FRONTEND_SG_ID \
  --region $AWS_REGION
```

### Step 5: Create ECS Services

#### Backend Service

```bash
# Using AWS CLI
aws ecs create-service \
  --cluster digitwin-cluster \
  --service-name digitwin-backend-service \
  --task-definition digitwin-backend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$BACKEND_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:$AWS_REGION:$AWS_ACCOUNT_ID:targetgroup/digitwin-backend-tg/xxx,containerName=digitwin-backend,containerPort=3000" \
  --region $AWS_REGION
```

#### Frontend Service

```bash
aws ecs create-service \
  --cluster digitwin-cluster \
  --service-name digitwin-frontend-service \
  --task-definition digitwin-frontend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$FRONTEND_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:$AWS_REGION:$AWS_ACCOUNT_ID:targetgroup/digitwin-frontend-tg/xxx,containerName=digitwin-frontend,containerPort=80" \
  --region $AWS_REGION
```

### Step 6: Initial Manual Deploy

在 GitHub Actions 自动部署之前，先手动部署一次：

```bash
# 1. Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. Build and push backend
cd digitwin-backend-go
docker build -t digitwin-backend .
docker tag digitwin-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 3. Build and push frontend
cd ../digitwin-frontend
docker build -t digitwin-frontend .
docker tag digitwin-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-frontend:latest

# 4. Register task definitions
cd ../digitwin-backend-go
aws ecs register-task-definition --cli-input-json file://task-definition.json

cd ../digitwin-frontend
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 5. Update services
aws ecs update-service --cluster digitwin-cluster --service digitwin-backend-service --force-new-deployment
aws ecs update-service --cluster digitwin-cluster --service digitwin-frontend-service --force-new-deployment
```

### Step 7: Test the Deployment

```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names digitwin-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Test backend
curl http://YOUR_ALB_DNS:3000/health

# Test frontend
curl http://YOUR_ALB_DNS/health
```

### Step 8: Configure GitHub Actions

现在每次推送到 `main` 分支时，GitHub Actions 会自动：
1. ✅ 运行测试
2. ✅ 构建 Docker 镜像
3. ✅ 推送到 ECR
4. ✅ 更新 ECS 服务
5. ✅ 等待部署完成

**触发部署：**
```bash
git add .
git commit -m "Setup CI/CD pipeline"
git push origin main
```

在 GitHub 查看部署进度：**Actions** tab → 查看 workflow 运行状态

## 🔍 Monitoring & Troubleshooting

### View Logs

```bash
# Backend logs
aws logs tail /ecs/digitwin-backend --follow

# Frontend logs
aws logs tail /ecs/digitwin-frontend --follow
```

### Check Service Status

```bash
# List services
aws ecs list-services --cluster digitwin-cluster

# Describe service
aws ecs describe-services \
  --cluster digitwin-cluster \
  --services digitwin-backend-service

# Check task status
aws ecs list-tasks --cluster digitwin-cluster --service-name digitwin-backend-service
```

### Common Issues

#### 1. Task fails to start
**Problem**: Container exits immediately
**Solution**:
- Check CloudWatch logs
- Verify environment variables and secrets
- Ensure health check endpoint exists

```bash
aws logs tail /ecs/digitwin-backend --since 10m
```

#### 2. Service shows "UNHEALTHY" targets
**Problem**: Health checks failing
**Solution**:
- Verify health check path exists (e.g., `/health`)
- Check security group allows traffic from ALB
- Increase health check grace period

#### 3. Can't pull image from ECR
**Problem**: `CannotPullContainerError`
**Solution**:
- Verify IAM execution role has ECR permissions
- Check image exists in ECR
- Verify task definition image URI is correct

```bash
aws ecr describe-images --repository-name digitwin-backend
```

#### 4. Database connection fails
**Problem**: Can't connect to RDS
**Solution**:
- Check RDS security group allows connections from ECS security group
- Verify DATABASE_URL secret is correct
- Ensure RDS is in same VPC or properly configured

## 💰 Cost Optimization

### Estimated Monthly Costs (Singapore Region)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate (Backend) | 0.5 vCPU, 1GB RAM, 24/7 | ~$15-20 |
| ECS Fargate (Frontend) | 0.25 vCPU, 0.5GB RAM, 24/7 | ~$8-12 |
| RDS PostgreSQL | db.t3.micro (existing) | ~$15 |
| ALB | Basic usage | ~$20 |
| ECR | Storage <1GB | ~$0.1 |
| CloudWatch Logs | <5GB/month | ~$2.5 |
| **Total** | | **~$60-70/month** |

### Cost Saving Tips

1. **Use Fargate Spot** for non-critical workloads (up to 70% savings)
2. **Enable auto-scaling** based on CPU/memory
3. **Set up CloudWatch alarms** to monitor costs
4. **Use ECR lifecycle policies** to delete old images
5. **Consider reserved capacity** for predictable workloads

## 🔐 Security Best Practices

- ✅ Store all sensitive data in Secrets Manager
- ✅ Enable VPC Flow Logs
- ✅ Use HTTPS/SSL for ALB (add ACM certificate)
- ✅ Implement least privilege IAM policies
- ✅ Enable ECR image scanning
- ✅ Regularly update base images and dependencies
- ✅ Configure WAF rules on ALB
- ✅ Enable CloudTrail for audit logging

## 🔄 Update Workflow

### Making Changes

1. **Make code changes** in local branch
2. **Commit and push** to GitHub
3. **Create Pull Request** (triggers test workflow)
4. **Merge to main** (triggers deployment workflow)
5. **Monitor deployment** in GitHub Actions and AWS Console

### Rollback

```bash
# Get previous task definition
aws ecs describe-task-definition \
  --task-definition digitwin-backend-task:1 \
  --query taskDefinition > rollback-task-def.json

# Update service to use previous version
aws ecs update-service \
  --cluster digitwin-cluster \
  --service digitwin-backend-service \
  --task-definition digitwin-backend-task:1
```

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🆘 Support

如果遇到问题：
1. 查看 CloudWatch Logs
2. 检查 ECS Service Events
3. 验证 IAM permissions
4. 查看 GitHub Actions logs
5. 参考本文档的 Troubleshooting 部分

---

**Created**: 2025-10-15
**Last Updated**: 2025-10-15
**Version**: 1.0
