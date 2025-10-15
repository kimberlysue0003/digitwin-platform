# 🚀 Amplify + EC2 快速部署指南（无需域名）

**总耗时：40分钟 | 成本：~$47/月（与现在相同）| 自动 CI/CD：✅**

## 📍 部署后的访问地址

部署完成后你会得到：

```
前端: https://main.xxxxxx.amplifyapp.com  ← Amplify 自动生成，免费 HTTPS
后端: http://18.142.236.220:3000          ← 你现有的 EC2
```

**完全不需要买域名！Amplify 会自动给你一个免费的 .amplifyapp.com 域名！**

## ⚡ 快速部署步骤

### 准备工作 ✅

你已经有了：
- ✅ EC2: `18.142.236.220`
- ✅ RDS: `digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com`
- ✅ SSH Key: `H:\Test\ecommerce-mini\ecommerce-key.pem`

### Step 1: 在 EC2 上安装 Docker (10分钟)

```bash
# 1. SSH 到你的 EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 3. 重新登录让 docker 权限生效
exit
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# 4. 验证 Docker
docker --version

# 5. 安装 AWS CLI（如果还没有）
sudo apt update
sudo apt install -y awscli

# 6. 配置 AWS credentials
aws configure
# 输入你的 AWS Access Key ID
# 输入你的 AWS Secret Access Key
# Region: ap-southeast-1
# Output format: json

# 7. 创建部署目录
sudo mkdir -p /opt/digitwin
sudo chown ubuntu:ubuntu /opt/digitwin
```

### Step 2: 创建 ECR 仓库 (2分钟)

```bash
# 在你的本地电脑运行
aws ecr create-repository \
  --repository-name digitwin-backend \
  --region ap-southeast-1 \
  --image-scanning-configuration scanOnPush=true

# 记录输出的 repositoryUri，类似：
# 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend
```

### Step 3: 配置 GitHub Secrets (5分钟)

打开你的 GitHub 仓库：
https://github.com/kimberlysue0003/digitwin-platform/settings/secrets/actions

点击 **New repository secret**，添加以下 5 个 secrets：

#### Secret 1: AWS_ACCESS_KEY_ID
```
Value: <你的 AWS Access Key>
```

#### Secret 2: AWS_SECRET_ACCESS_KEY
```
Value: <你的 AWS Secret Key>
```

#### Secret 3: EC2_HOST
```
Value: 18.142.236.220
```

#### Secret 4: EC2_USER
```
Value: ubuntu
```

#### Secret 5: EC2_SSH_KEY
```bash
# 复制你的 SSH 私钥内容
# Windows:
type H:\Test\ecommerce-mini\ecommerce-key.pem

# 将整个内容（包括 -----BEGIN RSA PRIVATE KEY----- 和 -----END RSA PRIVATE KEY-----）
# 粘贴到 GitHub Secret
```

#### Secret 6: DATABASE_URL
```
Value: postgresql://postgres:你的密码@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require
```

### Step 4: 设置 AWS Amplify（前端）(10分钟)

#### 4.1 打开 Amplify Console
https://console.aws.amazon.com/amplify/

#### 4.2 创建新应用
1. 点击 **New app** → **Host web app**
2. 选择 **GitHub**
3. 点击 **Connect to GitHub** 并授权
4. 选择仓库：`kimberlysue0003/digitwin-platform`
5. 选择分支：`main`
6. 点击 **Next**

#### 4.3 配置构建设置
Amplify 会自动检测到项目，但需要调整：

**App name**: `digitwin-frontend` (随便取)

**Build settings** 会自动填充，但需要确认是否正确：
- ✅ 检查是否使用了 `amplify.yml` 文件（项目根目录已创建）
- ✅ 如果没有，手动配置：
  - App root: `digitwin-frontend`
  - Build command: `npm run build`
  - Output directory: `dist`

#### 4.4 添加环境变量
在下方的 **Environment variables** 部分，点击 **Add environment variable**：

```
Key: VITE_API_URL
Value: http://18.142.236.220:3000
```

**⚠️ 注意：** 如果后续你想用 HTTPS，可以在 Amplify 部署后更新这个变量为：
```
https://你的amplify域名.amplifyapp.com/api
```
然后在 EC2 上配置 nginx 反向代理。

#### 4.5 部署！
1. 点击 **Next**
2. 检查所有设置
3. 点击 **Save and deploy**

**Amplify 会自动开始构建！** 你可以实时查看日志。

构建完成后，你会看到一个类似这样的 URL：
```
https://main.d1a2b3c4d5e6f7.amplifyapp.com
```

**这就是你的前端地址！** 完全免费，还自带 HTTPS 和全球 CDN！

### Step 5: 首次部署后端 (10分钟)

#### 5.1 手动推送第一个 Docker 镜像

```bash
# 在你的本地电脑，项目根目录
cd digitwin-backend-go

# 获取 ECR 登录
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# 构建镜像
docker build -t digitwin-backend .

# 标记镜像
docker tag digitwin-backend:latest <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 推送到 ECR
docker push <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest
```

#### 5.2 在 EC2 上运行

```bash
# SSH 到 EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# 登录 ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# 拉取镜像
docker pull <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 运行容器（替换 YOUR_DATABASE_PASSWORD）
docker run -d \
  --name digitwin-backend-go \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:YOUR_DATABASE_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require" \
  -e PORT=3000 \
  -e ENV=production \
  -e TZ=Asia/Singapore \
  --restart unless-stopped \
  <你的账户ID>.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 检查状态
docker ps
docker logs digitwin-backend-go

# 测试
curl http://localhost:3000/health
```

### Step 6: 测试完整系统 (3分钟)

```bash
# 测试后端
curl http://18.142.236.220:3000/health

# 在浏览器打开前端
# https://main.xxxxxx.amplifyapp.com （你的 Amplify URL）
```

## 🎉 完成！现在享受自动化 CI/CD

从现在开始：

### 更新后端
```bash
# 1. 修改代码
cd digitwin-backend-go
# ... 修改代码 ...

# 2. 提交并推送
git add .
git commit -m "Update backend"
git push origin main

# 3. GitHub Actions 会自动：
#    ✅ 运行测试
#    ✅ 构建 Docker 镜像
#    ✅ 推送到 ECR
#    ✅ 部署到 EC2
#    ✅ 健康检查
```

### 更新前端
```bash
# 1. 修改代码
cd digitwin-frontend
# ... 修改代码 ...

# 2. 提交并推送
git add .
git commit -m "Update frontend"
git push origin main

# 3. Amplify 会自动：
#    ✅ 检测到变化
#    ✅ 构建新版本
#    ✅ 部署到 CDN
#    ✅ 零停机更新
```

## 📊 查看部署状态

### 后端部署状态
https://github.com/kimberlysue0003/digitwin-platform/actions

### 前端部署状态
https://console.aws.amazon.com/amplify/
→ 选择你的 app → Build history

## 🆓 关于域名

### 现在（不需要域名）
```
前端: https://main.d1a2b3c4d5e6f7.amplifyapp.com  ✅ 免费 HTTPS
后端: http://18.142.236.220:3000                  ⚠️ HTTP only
```

### 如果以后想用自己的域名（可选）

**只需要在 Amplify Console 添加自定义域名：**

1. 购买域名（如 GoDaddy、Namecheap，~$10-15/年）
2. 在 Amplify Console → Domain management → Add domain
3. Amplify 会自动配置 HTTPS 证书（免费！）

**结果：**
```
前端: https://www.你的域名.com          ✅ 自动 HTTPS
后端: https://api.你的域名.com          ✅ 可以配置
```

## 💰 成本对比

| 项目 | 现在 | 这个方案 | 差异 |
|------|------|----------|------|
| EC2 | $30 | $30 | ➡️ 不变 |
| RDS | $15 | $15 | ➡️ 不变 |
| Amplify | $0 | $0-5 | ➕ 几乎免费 |
| ECR | $0 | $0.1 | ➕ 可忽略 |
| **总计** | **$47** | **~$47-52** | **几乎一样！** |

**Amplify 免费额度：**
- ✅ 每月 1000 分钟构建时间（够用！）
- ✅ 15 GB 存储
- ✅ 100 GB 流量
- ✅ 无限 HTTPS 请求

## 🔧 常见问题

### Q: 如果我的前端需要调用后端 API，会不会有 CORS 问题？
**A:** 需要在 Go 后端配置 CORS，允许 Amplify 域名：

```go
// 在你的 Go backend 中添加
router.Use(cors.New(cors.Config{
    AllowOrigins: []string{
        "https://main.d1a2b3c4d5e6f7.amplifyapp.com", // 你的 Amplify URL
        "http://localhost:5173", // 本地开发
    },
    AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
}))
```

### Q: Amplify 的域名可以改吗？
**A:**
- 默认域名格式：`https://main.随机字符.amplifyapp.com`
- 你可以在 Amplify Console 配置自定义二级域名（免费）
- 或者添加自己的域名（需要购买域名）

### Q: 部署失败怎么办？
**A:**
- **后端**：查看 GitHub Actions logs
- **前端**：查看 Amplify Console → Build logs
- **EC2**：SSH 进去查看 `docker logs digitwin-backend-go`

### Q: 我能回滚到之前的版本吗？
**A:**
- **前端**：Amplify 自动保存每次部署，可以一键回滚
- **后端**：ECR 保存所有镜像版本，可以手动回滚

### Q: 这个方案的优势是什么？
**A:**
1. ✅ **成本几乎不变**（~$47/月）
2. ✅ **自动 CI/CD**（不用再手动 SSH 部署）
3. ✅ **前端有 HTTPS**（Amplify 自动配置）
4. ✅ **全球 CDN**（前端访问更快）
5. ✅ **不需要买域名**（可以用免费的 .amplifyapp.com）
6. ✅ **简单可靠**（不需要学习 ECS、ALB 等复杂服务）

## 🎯 总结

这个方案是**成本最优**的自动化部署方案：
- 月费用和现在一样（~$47）
- 完全自动化 CI/CD
- 前端免费 HTTPS 和 CDN
- 不需要购买域名
- 部署简单，维护方便

**现在就可以开始！只需 40 分钟！**

---

**推荐指数**: ⭐⭐⭐⭐⭐
**适合**: 预算有限，想要自动化部署的项目
**下一步**: 按照上面的步骤，从 Step 1 开始！
