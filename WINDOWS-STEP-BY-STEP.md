# 🪟 Windows 用户超详细部署指南

## 开始之前

你需要准备：
- ✅ GitHub 账号（你已经有了）
- ✅ AWS 账号（你已经有了）
- ✅ 你的 SSH 密钥文件：`H:\Test\ecommerce-mini\ecommerce-key.pem`
- ✅ 你的 RDS 密码

部署后的结果：
```
前端网址：https://main.xxxxx.amplifyapp.com  ← 自动生成，免费 HTTPS
后端网址：http://18.142.236.220:3000         ← 你现有的 EC2
```

---

## 第一步：配置 GitHub Secrets（10分钟）⭐ 从这里开始

### 1.1 打开 GitHub Secrets 设置页面

1. 打开浏览器，访问你的仓库：
   ```
   https://github.com/kimberlysue0003/digitwin-platform
   ```

2. 点击顶部的 **Settings** 标签

3. 在左侧菜单找到 **Secrets and variables**，点击展开

4. 点击 **Actions**

5. 你会看到一个页面，标题是 "Actions secrets and variables"

6. 点击绿色按钮 **New repository secret**

### 1.2 添加第一个 Secret：AWS_ACCESS_KEY_ID

现在你看到一个表单，需要填两个框：

**Name（名称）:**
```
AWS_ACCESS_KEY_ID
```

**Secret（值）:**
```
<你的 AWS Access Key ID>
```

💡 **如何获取 AWS Access Key？**

方法一：如果你已经有了
- 打开你的 AWS credentials 文件
- Windows 路径：`C:\Users\你的用户名\.aws\credentials`
- 用记事本打开，会看到类似：
  ```
  [default]
  aws_access_key_id = AKIA...
  aws_secret_access_key = abc123...
  ```

方法二：如果没有，创建新的
1. 打开 AWS Console：https://console.aws.amazon.com/
2. 右上角点击你的用户名 → **Security credentials**
3. 向下滚动找到 **Access keys**
4. 点击 **Create access key**
5. 选择 **Command Line Interface (CLI)**
6. 勾选确认框，点击 **Next**
7. 可选：添加描述 "GitHub Actions"
8. 点击 **Create access key**
9. ⚠️ **重要：立即复制保存！关闭后无法再看到！**

填好后点击 **Add secret**

### 1.3 添加第二个 Secret：AWS_SECRET_ACCESS_KEY

再次点击 **New repository secret**

**Name:**
```
AWS_SECRET_ACCESS_KEY
```

**Secret:**
```
<你的 AWS Secret Access Key>
```
（就是上面创建 Access Key 时一起生成的那个 Secret）

点击 **Add secret**

### 1.4 添加第三个 Secret：EC2_HOST

再次点击 **New repository secret**

**Name:**
```
EC2_HOST
```

**Secret:**
```
18.142.236.220
```

点击 **Add secret**

### 1.5 添加第四个 Secret：EC2_USER

再次点击 **New repository secret**

**Name:**
```
EC2_USER
```

**Secret:**
```
ubuntu
```

点击 **Add secret**

### 1.6 添加第五个 Secret：EC2_SSH_KEY

这个稍微复杂一点，需要复制你的 SSH 私钥内容。

**方法一：用记事本打开**
1. 按 `Win + E` 打开文件资源管理器
2. 导航到：`H:\Test\ecommerce-mini\`
3. 找到文件：`ecommerce-key.pem`
4. 右键点击 → **打开方式** → **记事本**
5. 按 `Ctrl + A` 全选所有内容
6. 按 `Ctrl + C` 复制

**方法二：用命令行**
1. 按 `Win + R`
2. 输入 `cmd` 回车
3. 输入命令：
   ```cmd
   type H:\Test\ecommerce-mini\ecommerce-key.pem
   ```
4. 全选输出内容并复制（右键 → 标记 → 选择 → 回车复制）

现在回到 GitHub，再次点击 **New repository secret**

**Name:**
```
EC2_SSH_KEY
```

**Secret:**
```
（粘贴整个 .pem 文件的内容，包括）
-----BEGIN RSA PRIVATE KEY-----
... 很多行 ...
-----END RSA PRIVATE KEY-----
```

⚠️ **注意：必须包括开头和结尾的那两行！**

点击 **Add secret**

### 1.7 添加第六个 Secret：DATABASE_URL

再次点击 **New repository secret**

**Name:**
```
DATABASE_URL
```

**Secret:**
```
postgresql://postgres:你的RDS密码@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require
```

⚠️ **重要：把 `你的RDS密码` 替换成你的实际密码！**

点击 **Add secret**

### ✅ 检查确认

现在你应该看到 6 个 Secrets：
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- EC2_HOST
- EC2_USER
- EC2_SSH_KEY
- DATABASE_URL

如果都有了，第一步完成！✨

---

## 第二步：创建 ECR 仓库（5分钟）

ECR 是存放 Docker 镜像的地方，类似 Docker Hub。

### 2.1 打开 AWS ECR 控制台

1. 打开 AWS Console：https://console.aws.amazon.com/
2. 在顶部搜索框输入：`ECR`
3. 点击 **Elastic Container Registry**

### 2.2 创建仓库

1. 确认右上角地区是：**Singapore (ap-southeast-1)**
   - 如果不是，点击切换到新加坡地区

2. 点击左侧菜单 **Repositories**

3. 点击橙色按钮 **Create repository**

4. 填写表单：

   **Visibility settings（可见性）:**
   - 选择：☑️ **Private**（私有）

   **Repository name（仓库名称）:**
   ```
   digitwin-backend
   ```

   **Tag immutability（标签不可变性）:**
   - 保持默认：**Disabled**

   **Image scan on push（推送时扫描）:**
   - ☑️ 勾选 **Enabled**（启用扫描，增加安全性）

   **Encryption settings（加密设置）:**
   - 保持默认：**AES-256**

5. 向下滚动，点击 **Create repository**

### 2.3 记录仓库 URI

创建成功后，你会看到仓库列表。找到 `digitwin-backend`，复制它的 **URI**。

URI 格式类似：
```
123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend
```

💾 **保存这个 URI，后面会用到！**

可以复制到记事本保存。

---

## 第三步：在 EC2 上安装 Docker（15分钟）

### 3.1 打开 PowerShell 或 CMD

按 `Win + R`，输入：
```
powershell
```
回车

### 3.2 连接到 EC2

在 PowerShell 中输入：
```powershell
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220
```

如果提示 "Are you sure you want to continue connecting"，输入 `yes` 回车

现在你应该看到类似这样的提示符：
```
ubuntu@ip-xxx:~$
```

说明你已经连接到 EC2 了！

### 3.3 安装 Docker

复制粘贴以下命令（一次一行）：

```bash
# 1. 下载 Docker 安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh

# 2. 运行安装脚本
sudo sh get-docker.sh

# 3. 把当前用户添加到 docker 组
sudo usermod -aG docker ubuntu

# 4. 退出重新登录（让权限生效）
exit
```

### 3.4 重新连接 EC2

在 PowerShell 再次输入：
```powershell
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220
```

### 3.5 验证 Docker 安装

```bash
docker --version
```

应该看到类似：`Docker version 24.0.x`

### 3.6 安装 AWS CLI（如果还没有）

```bash
# 检查是否已安装
aws --version

# 如果没有，安装
sudo apt update
sudo apt install -y awscli

# 验证
aws --version
```

### 3.7 配置 AWS CLI

```bash
aws configure
```

会提示输入以下信息：

```
AWS Access Key ID [None]: <粘贴你的 Access Key ID>
AWS Secret Access Key [None]: <粘贴你的 Secret Access Key>
Default region name [None]: ap-southeast-1
Default output format [None]: json
```

### 3.8 测试 AWS CLI

```bash
aws ecr describe-repositories --region ap-southeast-1
```

应该能看到你刚才创建的 `digitwin-backend` 仓库信息。

### ✅ 第三步完成！

现在 EC2 上已经：
- ✅ 安装了 Docker
- ✅ 安装了 AWS CLI
- ✅ 配置了 AWS 凭证

保持 SSH 连接打开，继续下一步。

---

## 第四步：首次手动部署后端（10分钟）

### 4.1 在本地构建并推送镜像

**回到你的 Windows PowerShell**（不是 EC2 的 SSH 窗口）

打开一个新的 PowerShell 窗口：
```powershell
# 1. 进入项目目录
cd H:\Test\digitwin-platform\digitwin-backend-go

# 2. 登录到 ECR（替换 123456789012 为你的实际账户 ID）
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com

# 3. 构建 Docker 镜像
docker build -t digitwin-backend .

# 4. 标记镜像（替换为你的 ECR URI）
docker tag digitwin-backend:latest 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 5. 推送到 ECR
docker push 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest
```

💡 **如何找到你的账户 ID？**
- 在 ECR 仓库 URI 的开头
- 或者运行：`aws sts get-caller-identity --query Account --output text`

这个过程可能需要几分钟，因为要上传 Docker 镜像。

### 4.2 在 EC2 上拉取并运行

**切换回 EC2 的 SSH 窗口**

```bash
# 1. 登录 ECR（替换账户 ID）
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. 拉取镜像（替换为你的 ECR URI）
docker pull 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 3. 停止并删除旧容器（如果有）
docker stop digitwin-backend-go 2>/dev/null || true
docker rm digitwin-backend-go 2>/dev/null || true

# 4. 运行新容器（⚠️ 替换 YOUR_DATABASE_PASSWORD）
docker run -d \
  --name digitwin-backend-go \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:YOUR_DATABASE_PASSWORD@digitwin-db.cbaai4igsjtt.ap-southeast-1.rds.amazonaws.com:5432/digitwin?sslmode=require" \
  -e PORT=3000 \
  -e ENV=production \
  -e TZ=Asia/Singapore \
  --restart unless-stopped \
  123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest
```

⚠️ **重要：记得把 `YOUR_DATABASE_PASSWORD` 和 `123456789012` 替换成你的实际值！**

### 4.3 检查后端是否运行成功

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs digitwin-backend-go

# 测试健康检查
curl http://localhost:3000/health
```

如果看到类似 `{"status":"ok"}` 的输出，说明后端启动成功！✨

你也可以在浏览器打开：
```
http://18.142.236.220:3000/health
```

---

## 第五步：设置 AWS Amplify（前端）（10分钟）⭐ 最简单的部分

### 5.1 打开 AWS Amplify 控制台

1. 打开：https://console.aws.amazon.com/amplify/
2. 确认右上角地区是：**Singapore (ap-southeast-1)**

### 5.2 创建新应用

1. 点击橙色按钮 **Create new app**
2. 选择：**Host web app**

### 5.3 连接 GitHub

1. 在 "Get started with Amplify Hosting" 页面
2. 选择：**GitHub**
3. 点击 **Authorize AWS Amplify** 按钮
4. 在弹出的 GitHub 授权页面，点击 **Authorize**（可能需要输入 GitHub 密码）

### 5.4 选择仓库和分支

授权成功后：

1. **Repository（仓库）:** 从下拉菜单选择 `kimberlysue0003/digitwin-platform`
2. **Branch（分支）:** 选择 `main`
3. 点击 **Next**

### 5.5 配置应用设置

在 "App settings" 页面：

**App name（应用名称）:**
```
digitwin-platform
```
（可以改成你喜欢的名字）

**Environment（环境名称）:**
```
production
```
（保持默认即可）

向下滚动到 **Build settings**：

Amplify 会自动检测到项目。检查是否显示：
- Build command: `npm run build`
- Output directory: `dist`

如果自动检测错误，点击 **Edit**，修改为：

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

### 5.6 添加环境变量

向下滚动到 **Advanced settings**，点击展开。

找到 **Environment variables**，点击 **Add environment variable**

**Key（键）:**
```
VITE_API_URL
```

**Value（值）:**
```
http://18.142.236.220:3000
```

### 5.7 开始部署！

1. 检查所有设置无误
2. 点击 **Next**
3. 在 Review 页面，再次检查
4. 点击 **Save and deploy**

### 5.8 等待构建完成

现在 Amplify 开始构建你的前端！

你会看到：
1. **Provision（准备环境）** - 绿色勾号
2. **Build（构建）** - 进行中...（需要 3-5 分钟）
3. **Deploy（部署）** - 等待中
4. **Verify（验证）** - 等待中

💡 **提示：**
- 可以点击 **Build** 查看实时日志
- 如果构建失败，查看日志找原因

### 5.9 获取网址

构建成功后，你会看到一个绿色的 URL：

```
https://main.d1a2b3c4d5e6f7.amplifyapp.com
```

**这就是你的前端网址！**

🎉 点击访问，你的应用应该已经在线了！

---

## ✅ 完成！现在享受自动 CI/CD

### 测试自动部署

#### 测试后端自动部署

在你的 Windows 电脑：

```powershell
# 1. 回到项目目录
cd H:\Test\digitwin-platform

# 2. 做个小改动
cd digitwin-backend-go
echo "// Test update" >> cmd/server/main.go

# 3. 提交并推送
git add .
git commit -m "Test backend auto-deploy"
git push origin main

# 4. 查看 GitHub Actions
# 浏览器打开：https://github.com/kimberlysue0003/digitwin-platform/actions
```

你会看到一个新的 workflow 正在运行！
- ✅ 测试
- ✅ 构建 Docker 镜像
- ✅ 推送到 ECR
- ✅ SSH 到 EC2 部署

整个过程大约 3-5 分钟。

#### 测试前端自动部署

```powershell
# 1. 修改前端
cd ..\digitwin-frontend
echo "/* Test update */" >> src/App.tsx

# 2. 提交并推送
git add .
git commit -m "Test frontend auto-deploy"
git push origin main

# 3. 查看 Amplify
# 浏览器打开：https://console.aws.amazon.com/amplify/
```

Amplify 会自动检测到代码变化，开始新的构建！

---

## 🎯 最终结果

你现在有了：

### 前端
- ✅ 网址：`https://main.xxxxx.amplifyapp.com`
- ✅ 免费 HTTPS
- ✅ 全球 CDN
- ✅ 自动部署

### 后端
- ✅ 网址：`http://18.142.236.220:3000`
- ✅ Docker 容器化
- ✅ 自动部署
- ✅ 健康检查

### CI/CD
- ✅ `git push` 自动触发部署
- ✅ 前端：Amplify 自动构建
- ✅ 后端：GitHub Actions → ECR → EC2

---

## 🔧 常用命令速查

### 查看后端状态（SSH 到 EC2）

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs digitwin-backend-go

# 重启容器
docker restart digitwin-backend-go

# 查看最近 50 行日志
docker logs --tail 50 digitwin-backend-go

# 实时查看日志
docker logs -f digitwin-backend-go
```

### 手动更新后端

```bash
# SSH 到 EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# 拉取最新镜像
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 你的账户ID.dkr.ecr.ap-southeast-1.amazonaws.com
docker pull 你的账户ID.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend:latest

# 重启容器
docker stop digitwin-backend-go
docker rm digitwin-backend-go
# （然后运行之前的 docker run 命令）
```

---

## ❓ 遇到问题？

### GitHub Actions 失败

1. 打开：https://github.com/kimberlysue0003/digitwin-platform/actions
2. 点击失败的 workflow
3. 查看红色 ✗ 的步骤
4. 点击展开查看详细错误

常见错误：
- **AWS 认证失败**：检查 GitHub Secrets 中的 AWS keys
- **SSH 连接失败**：检查 EC2_SSH_KEY 是否完整
- **ECR 推送失败**：检查 ECR 仓库是否存在

### Amplify 构建失败

1. 打开：https://console.aws.amazon.com/amplify/
2. 点击你的 app
3. 点击失败的构建
4. 查看 Build logs

常见错误：
- **npm install 失败**：检查 package.json
- **Build 失败**：检查 VITE_API_URL 环境变量
- **路径错误**：检查 amplify.yml 配置

### 后端无法访问

```bash
# SSH 到 EC2
ssh -i H:\Test\ecommerce-mini\ecommerce-key.pem ubuntu@18.142.236.220

# 检查容器是否运行
docker ps

# 查看日志找错误
docker logs digitwin-backend-go

# 检查端口
sudo netstat -tulpn | grep 3000

# 测试数据库连接
docker exec digitwin-backend-go wget -O- http://localhost:3000/health
```

---

## 💰 成本提醒

你的月度费用：

| 服务 | 成本 |
|------|------|
| EC2 t2.medium | ~$30 |
| RDS db.t3.micro | ~$15 |
| ECR（<1GB） | ~$0.1 |
| Amplify（正常使用）| $0-5 |
| Data Transfer | ~$2 |
| **总计** | **~$47-52** |

Amplify 免费额度：
- 每月 1000 分钟构建时间
- 15 GB 存储
- 100 GB 流量

通常小项目用不完免费额度！

---

## 🎉 恭喜！

你已经完成了完整的 AWS CI/CD 部署！

从现在开始，每次 `git push` 都会自动部署，再也不用手动 SSH 了！

**享受自动化的乐趣吧！** 🚀

---

**创建时间**: 2025-10-15
**总耗时**: ~50 分钟
**难度**: ⭐⭐（有我带着你，很简单！）
