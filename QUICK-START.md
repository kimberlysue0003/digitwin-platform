# 🚀 Quick Start - AWS ECS CI/CD 部署

这是一个快速开始指南，帮助你在 30 分钟内完成 DigiTwin Platform 的 AWS ECS 自动化部署。

## ⚡ 快速部署步骤

### 1. 准备工作 (5分钟)

```bash
# 确认 AWS CLI 已安装和配置
aws --version
aws configure list

# 克隆仓库（如果还没有）
git clone https://github.com/kimberlysue0003/digitwin-platform.git
cd digitwin-platform
```

### 2. 设置 AWS 资源 (10分钟)

```bash
# 进入 aws-setup 目录
cd aws-setup

# 运行自动化设置脚本
chmod +x setup-aws-resources.sh
./setup-aws-resources.sh

# 记录输出的 AWS Account ID
# 保存 aws-config.env 文件内容
```

### 3. 配置密钥 (5分钟)

#### A. 在 AWS Secrets Manager 创建密钥

```bash
# 替换 YOUR_PASSWORD 为你的实际密码
aws secretsmanager create-secret \
  --name digitwin/database-url \
  --secret-string "postgresql://postgres:YOUR_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require" \
  --region ap-southeast-1
```

#### B. 在 GitHub 设置 Secrets

1. 打开 GitHub 仓库
2. **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret** 添加：

```
Name: AWS_ACCESS_KEY_ID
Value: <your-aws-access-key>

Name: AWS_SECRET_ACCESS_KEY
Value: <your-aws-secret-key>

Name: VITE_API_URL
Value: http://YOUR_ALB_DNS/api  (先暂时填写 http://localhost:3000)
```

### 4. 更新配置文件 (3分钟)

从 `aws-setup/aws-config.env` 获取你的 AWS Account ID，然后：

```bash
# 使用你喜欢的编辑器替换 YOUR_ACCOUNT_ID
# 需要更新的文件：
# - digitwin-backend-go/task-definition.json
# - digitwin-frontend/task-definition.json
```

**快速替换命令（Linux/Mac/Git Bash）：**
```bash
# 获取 Account ID
source aws-setup/aws-config.env

# 自动替换
sed -i "s/YOUR_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" digitwin-backend-go/task-definition.json
sed -i "s/YOUR_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" digitwin-frontend/task-definition.json
```

### 5. 创建 Application Load Balancer (5分钟)

#### 使用 AWS Console（推荐新手）：

1. 打开 [AWS EC2 Console](https://console.aws.amazon.com/ec2/) → **Load Balancers**
2. 点击 **Create Load Balancer** → 选择 **Application Load Balancer**
3. 配置：
   - Name: `digitwin-alb`
   - Scheme: **Internet-facing**
   - 选择至少 **2个子网**（不同可用区）
4. 创建 **两个 Target Groups**：
   - `digitwin-frontend-tg` (Port 80, health check: `/health`)
   - `digitwin-backend-tg` (Port 3000, health check: `/health`)
5. 配置 **两个 Listeners**：
   - HTTP:80 → frontend target group
   - HTTP:3000 → backend target group
6. 点击 **Create**

7. **重要：** 记录 ALB 的 DNS name（例如：`digitwin-alb-123456789.ap-southeast-1.elb.amazonaws.com`）

### 6. 创建 ECS Services (5分钟)

在 AWS Console 中：

#### Backend Service:
1. 打开 [ECS Console](https://console.aws.amazon.com/ecs/)
2. 点击 **digitwin-cluster**
3. 在 **Services** tab，点击 **Create**
4. 配置：
   - Launch type: **Fargate**
   - Task Definition: **digitwin-backend-task** (注：首次需要手动推送镜像后才会有)
   - Service name: `digitwin-backend-service`
   - Number of tasks: 1
   - VPC: 选择默认 VPC
   - Subnets: 选择至少 2 个
   - Security group: 选择之前创建的 `digitwin-backend-sg`
   - Load balancer: 选择 `digitwin-alb`
   - Target group: 选择 `digitwin-backend-tg`

#### Frontend Service:
重复上述步骤，但使用：
- Task Definition: **digitwin-frontend-task**
- Service name: `digitwin-frontend-service`
- Security group: `digitwin-frontend-sg`
- Target group: `digitwin-frontend-tg`

### 7. 首次手动部署 (5分钟)

```bash
# 1. 登录 ECR
source aws-setup/aws-config.env
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $BACKEND_ECR_REPO

# 2. 构建并推送 Backend
cd digitwin-backend-go
docker build -t digitwin-backend .
docker tag digitwin-backend:latest $BACKEND_ECR_REPO:latest
docker push $BACKEND_ECR_REPO:latest

# 3. 构建并推送 Frontend
cd ../digitwin-frontend
docker build -t digitwin-frontend .
docker tag digitwin-frontend:latest $FRONTEND_ECR_REPO:latest
docker push $FRONTEND_ECR_REPO:latest

# 4. 注册 Task Definitions
cd ../digitwin-backend-go
aws ecs register-task-definition --cli-input-json file://task-definition.json

cd ../digitwin-frontend
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 5. 更新 Services (如果已创建)
aws ecs update-service --cluster digitwin-cluster --service digitwin-backend-service --force-new-deployment
aws ecs update-service --cluster digitwin-cluster --service digitwin-frontend-service --force-new-deployment
```

### 8. 验证部署 (2分钟)

```bash
# 获取 ALB DNS
aws elbv2 describe-load-balancers \
  --names digitwin-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# 测试 Backend
curl http://YOUR_ALB_DNS:3000/health

# 测试 Frontend
curl http://YOUR_ALB_DNS/health

# 在浏览器打开
# http://YOUR_ALB_DNS
```

### 9. 启用自动 CI/CD ✨

现在所有设置完成！提交代码到 GitHub 即可触发自动部署：

```bash
git add .
git commit -m "Setup AWS ECS CI/CD pipeline"
git push origin main
```

🎉 **完成！** 从现在开始，每次推送到 `main` 分支，都会自动部署到 AWS！

## 📊 监控部署

### GitHub Actions
- 打开 GitHub 仓库 → **Actions** tab
- 查看 workflow 运行状态
- 绿色✓ = 部署成功
- 红色✗ = 部署失败（查看日志）

### AWS ECS
```bash
# 查看服务状态
aws ecs describe-services \
  --cluster digitwin-cluster \
  --services digitwin-backend-service digitwin-frontend-service

# 查看日志
aws logs tail /ecs/digitwin-backend --follow
aws logs tail /ecs/digitwin-frontend --follow
```

## 🔧 常见问题

### Q1: Task 一直处于 PENDING 状态
**A:** 检查：
- Subnets 是否有足够的 IP 地址
- Security Groups 是否正确配置
- IAM roles 是否有正确的权限

```bash
# 查看 service events
aws ecs describe-services --cluster digitwin-cluster --services digitwin-backend-service
```

### Q2: 无法拉取 Docker 镜像
**A:** 确认：
- ECR 中镜像已推送成功
- Task execution role 有 ECR 权限
- Task definition 中的 image URI 正确

```bash
# 检查 ECR 镜像
aws ecr describe-images --repository-name digitwin-backend
```

### Q3: Health check 失败
**A:** 验证：
- 应用确实在监听指定端口
- Health check endpoint 存在（如 `/health`）
- Security group 允许来自 ALB 的流量

### Q4: 数据库连接失败
**A:** 检查：
- RDS security group 允许来自 ECS security group 的连接
- DATABASE_URL secret 格式正确
- 数据库确实可访问

```bash
# 测试数据库连接（从 ECS task）
aws ecs execute-command \
  --cluster digitwin-cluster \
  --task TASK_ID \
  --container digitwin-backend \
  --interactive \
  --command "sh"
```

## 📝 下一步

现在你已经完成了基础部署！考虑以下改进：

1. **添加 HTTPS**: 在 ALB 上配置 SSL 证书
2. **配置域名**: 使用 Route 53 添加自定义域名
3. **启用自动扩展**: 根据 CPU/内存自动调整容器数量
4. **添加 Redis**: 提高 API 响应速度
5. **设置告警**: CloudWatch Alarms 监控异常

详细步骤请参考：[AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)

## 🆘 需要帮助？

- 详细文档: [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)
- AWS ECS 文档: https://docs.aws.amazon.com/ecs/
- GitHub Actions 文档: https://docs.github.com/en/actions

---

**部署时间**: ~30 分钟
**难度**: 中级
**成本**: ~$60-70/月
