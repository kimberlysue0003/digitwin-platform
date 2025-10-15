# 前端与 Go 后端集成指南

## ✅ 已完成的集成工作

1. **创建了 API 配置** - [src/config/api.ts](src/config/api.ts)
   - 配置了后端 URL: `http://localhost:8080`
   - 配置了 WebSocket URL: `ws://localhost:8080/ws`

2. **创建了 API 服务** - [src/services/apiService.ts](src/services/apiService.ts)
   - `fetchPlanningAreas()` - 获取所有规划区域
   - `fetchBuildingsByArea(areaId)` - 获取指定区域的建筑物
   - `fetchStreamlinesByArea(areaId)` - 获取风力流线
   - `checkHealth()` - 健康检查

3. **创建了测试页面** - [src/pages/TestConnection.tsx](src/pages/TestConnection.tsx)
   - 测试所有 API 端点连接
   - 测试 WebSocket 连接

4. **环境变量配置** - [.env.local](.env.local)
   - `VITE_API_URL=http://localhost:8080`
   - `VITE_WS_URL=ws://localhost:8080/ws`

## 🚀 快速开始

### 1. 确保 Go 后端正在运行

```bash
# 在 digitwin-backend-go 目录
cd ../digitwin-backend-go

# 启动 Docker 容器
docker start digitwin-postgres digitwin-redis

# 启动服务器
go run cmd/server/main.go
```

后端应该在 http://localhost:8080 运行。

### 2. 启动前端开发服务器

```bash
# 在 digitwin-frontend 目录
cd digitwin-frontend

# 安装依赖（如果还没有安装）
npm install

# 启动开发服务器
npm run dev
```

前端会在 http://localhost:5173 运行（或其他端口）。

### 3. 测试连接

打开浏览器访问测试页面（需要手动添加路由）：

或者在浏览器控制台测试 API：

```javascript
// 测试健康检查
fetch('http://localhost:8080/health').then(r => r.json()).then(console.log)

// 测试规划区域
fetch('http://localhost:8080/api/areas').then(r => r.json()).then(console.log)

// 测试建筑物
fetch('http://localhost:8080/api/buildings/area-a-1').then(r => r.json()).then(console.log)
```

## 📊 可用的 API 端点

### Planning Areas (规划区域)
- `GET /api/areas` - 获取所有区域
- `GET /api/areas/:id` - 获取指定区域
- `GET /api/areas/region/:region` - 按区域筛选

### Buildings (建筑物)
- `GET /api/buildings/:areaId` - 获取指定区域的建筑物
- `GET /api/buildings/:areaId/stats` - 获取统计信息

### Wind Streamlines (风力流线)
- `GET /api/streamlines/:areaId/all` - 获取所有流线
- `GET /api/streamlines/:areaId?direction=N` - 按方向筛选

### Health Check
- `GET /health` - 健康检查（数据库 + Redis）

### WebSocket
- `ws://localhost:8080/ws?areaId=area-a-1` - 实时数据推送

## 🔧 下一步集成

### 1. 修改 BuildingsLayer 组件

将 `src/components/3d/BuildingsLayer.tsx` 改为使用新的 API：

```typescript
import { fetchBuildingsByArea } from '../../services/apiService';

// 替换 OSM 获取逻辑
const buildings = await fetchBuildingsByArea(selectedAreaId);
```

### 2. 修改 WindStreamlines 组件

将 `src/components/3d/WindStreamlines.tsx` 改为使用新的 API：

```typescript
import { fetchStreamlinesByArea } from '../../services/apiService';

const streamlines = await fetchStreamlinesByArea(selectedAreaId);
```

### 3. 集成 WebSocket 实时数据

更新 `src/components/DataFetcher.tsx` 使用 WebSocket：

```typescript
import { useWebSocket } from '../hooks/useWebSocket';
import { buildWebSocketUrl } from '../config/api';

// 在组件中
useWebSocket({
  url: buildWebSocketUrl(selectedAreaId),
  onOpen: () => console.log('WebSocket connected'),
});
```

## 🧪 测试检查清单

- [ ] Go 后端服务器运行在 localhost:8080
- [ ] PostgreSQL 容器运行在 localhost:5433
- [ ] Redis 容器运行在 localhost:6379
- [ ] 健康检查 API 返回成功
- [ ] 能够获取规划区域列表（55个区域）
- [ ] 能够获取建筑物数据（7583栋建筑）
- [ ] 能够获取风力流线（4206条流线）
- [ ] WebSocket 连接成功
- [ ] CORS 正常（前端能访问后端）

## 🐛 常见问题

### CORS 错误

如果看到 CORS 错误，确保 Go 后端的 CORS 配置包含前端地址：

```env
# digitwin-backend-go/.env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 连接被拒绝

1. 确认 Go 后端正在运行
2. 确认端口 8080 没有被占用
3. 检查防火墙设置

### 数据库连接失败

1. 确认 Docker 容器正在运行：`docker ps`
2. 启动容器：`docker start digitwin-postgres digitwin-redis`

## 📈 性能对比

使用新的 Go 后端 vs 旧的 OSM API：

| 指标 | OSM API | Go 后端 |
|------|---------|---------|
| 数据加载速度 | ~5-10秒 | ~50-100ms |
| 数据完整性 | 依赖网络 | 本地数据库 |
| 离线工作 | ❌ | ✅ |
| 实时更新 | ❌ | ✅ (WebSocket) |
| 缓存支持 | ❌ | ✅ (Redis) |

## 🎯 推荐的集成步骤

1. ✅ **阶段 1: 测试连接** （已完成）
   - 创建 API 服务
   - 创建测试页面
   - 验证基本连接

2. **阶段 2: 集成建筑物数据** （下一步）
   - 修改 BuildingsLayer 组件
   - 从 Go 后端获取数据
   - 测试 3D 渲染

3. **阶段 3: 集成流线数据**
   - 修改 WindStreamlines 组件
   - 从 Go 后端获取数据
   - 测试可视化效果

4. **阶段 4: WebSocket 实时数据**
   - 集成 WebSocket 连接
   - 实时更新环境数据
   - 测试数据推送

5. **阶段 5: 优化与测试**
   - 性能优化
   - 错误处理
   - 用户体验改进

---

## ⚠️ 常见启动问题与解决方案

### 问题 1: Go 文件编码错误 (UTF-16)

**症状：**
```
unexpected NUL in input
failed to read file
```

**原因：** Go 源文件被意外保存为 UTF-16 编码，而 Go 编译器只支持 UTF-8。

**解决方案：**
```bash
cd digitwin-backend-go

# 转换文件编码为 UTF-8
iconv -f UTF-16LE -t UTF-8 internal/services/building_service.go > temp.go && mv temp.go internal/services/building_service.go
iconv -f UTF-16LE -t UTF-8 internal/handlers/building_handler.go > temp.go && mv temp.go internal/handlers/building_handler.go
iconv -f UTF-16LE -t UTF-8 internal/routes/routes.go > temp.go && mv temp.go internal/routes/routes.go

# 或者直接从 git 恢复
git checkout HEAD -- internal/services/building_service.go internal/handlers/building_handler.go internal/routes/routes.go
```

### 问题 2: 数据库连接失败 (端口错误)

**症状：**
```
failed to connect to database: localhost:5432
Password authentication failed
```

**原因：** Go 后端从错误的目录启动，`.env` 文件没有被正确加载，导致使用默认端口 5432 而非配置的 5433。

**解决方案：**
```bash
# ❌ 错误的启动方式（在 cmd/server 目录）
cd digitwin-backend-go/cmd/server
go run main.go  # 找不到 .env 文件

# ✅ 正确的启动方式（在项目根目录）
cd digitwin-backend-go
go run cmd/server/main.go  # 能正确读取 .env 文件
```

**配置检查：**
```bash
# 确认 .env 文件存在且配置正确
cat digitwin-backend-go/.env

# 应该包含：
# DB_PORT=5433  # PostgreSQL 运行在 5433 端口
```

### 问题 3: Frontend 端口冲突

**症状：**
```
Port 5173 is in use, trying another one...
Local: http://localhost:5174/
```

**原因：** 默认端口 5173 被占用，Vite 自动切换到 5174。

**影响：** 无影响，Vite 会自动选择可用端口。

**注意：** 记录实际使用的端口，更新浏览器访问地址。

### 问题 4: 后台进程管理

**查看运行中的后台进程：**
```bash
# 使用 BashOutput 工具查看进程输出
# 进程 ID 会在启动时显示

# 示例进程 ID：
# - Go Backend: 7682ec
# - Frontend: 8fe417
```

**停止后台进程：**
```bash
# 在 Claude Code 中使用 KillShell 工具
# 或者手动查找并结束进程

# Windows:
taskkill /F /IM go.exe
taskkill /F /IM node.exe

# Linux/Mac:
pkill -f "go run"
pkill -f "vite"
```

### 问题 5: Docker 容器未启动

**症状：**
```
Failed to connect to database
connection refused
```

**检查容器状态：**
```bash
docker ps --filter "name=digitwin"

# 应该看到：
# digitwin-postgres   Up X minutes (healthy)
# digitwin-redis      Up X minutes (healthy)
```

**启动容器：**
```bash
docker start digitwin-postgres digitwin-redis

# 等待容器变为 healthy 状态（约 10-30 秒）
docker ps --filter "name=digitwin"
```

## 📋 完整启动流程清单

### 1️⃣ 启动 Docker 容器
```bash
# 检查容器状态
docker ps --filter "name=digitwin"

# 如果没有运行，启动容器
docker start digitwin-postgres digitwin-redis

# 验证健康状态
docker ps --filter "name=digitwin" --format "{{.Names}}\t{{.Status}}"
```

### 2️⃣ 启动 Go 后端
```bash
# ⚠️ 重要：必须在项目根目录启动
cd digitwin-backend-go

# 检查 .env 文件存在
ls -la .env

# 启动后端
go run cmd/server/main.go

# 验证启动成功
curl http://localhost:8080/health
```

**预期输出：**
```json
{"success":true,"data":{"database":{"status":"healthy"},"redis":{"status":"healthy"},"status":"healthy"}}
```

### 3️⃣ 启动前端
```bash
cd digitwin-frontend

# 启动开发服务器
npm run dev

# 访问前端（记录实际端口）
# Local: http://localhost:5173/ 或 5174/
```

### 4️⃣ 验证所有服务

**后端健康检查：**
```bash
curl http://localhost:8080/health
```

**前端页面：**
```bash
# 打开浏览器访问
# http://localhost:5173 或 http://localhost:5174
```

**Docker 容器：**
```bash
docker ps --filter "name=digitwin"
```

---

**准备就绪！** 🎉 现在你可以启动前端并测试与 Go 后端的连接了。
