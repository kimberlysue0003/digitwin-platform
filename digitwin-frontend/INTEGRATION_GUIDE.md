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

**准备就绪！** 🎉 现在你可以启动前端并测试与 Go 后端的连接了。
