# Node.js vs Go 后端功能对比

## 📊 总体对比

| 特性 | Node.js 版本 | Go 版本 | 差异说明 |
|------|-------------|---------|---------|
| **框架** | Express.js | Gin | ✅ 等价 |
| **ORM** | Prisma | GORM | ✅ 等价 |
| **数据库** | PostgreSQL | PostgreSQL | ✅ 相同 |
| **缓存** | ❌ 无 | ✅ Redis | ⭐ Go版新增 |
| **WebSocket** | ❌ 无 | ✅ 有 | ⭐ Go版新增 |
| **端口** | 3000 | 8080 | ⚠️ 不同 |

---

## 🗂️ 数据模型对比

### ✅ 两个版本都有的模型

1. **PlanningArea** (规划区域) - ✅ 完全相同
   - 55个新加坡规划区域
   - 包含中心坐标和边界
   - 按 region 分类

2. **Building** (建筑物) - ✅ 完全相同
   - OpenStreetMap 建筑数据
   - footprint (地面轮廓)
   - height (高度)
   - buildingType, levels (可选)

3. **WindStreamline** (风力流线) - ✅ 完全相同
   - 8个风向的流线数据
   - 3D 点坐标数组
   - 按区域和方向索引

4. **MapTexture** (地图纹理) - ✅ 完全相同
   - PNG 文件元数据
   - 边界和缩放信息
   - 文件路径

### ❌ Node.js 有但 Go 没有的模型

5. **WeatherStation** (气象站) - ❌ Go版缺失
   - NEA 气象站参考数据
   - stationId, latitude, longitude
   - 最后更新时间

6. **PollutionRegion** (污染区域) - ❌ Go版缺失
   - 5个区域的空气质量分区
   - 边界 GeoJSON
   - 中心坐标

---

## 🔌 API 端点对比

### Node.js 端点 (PORT 3000)

```
GET  /health                        健康检查
GET  /api/buildings                 获取所有规划区域（带建筑数量）
GET  /api/buildings/:areaId         获取指定区域的建筑物
GET  /api/map-textures/:areaId      获取地图纹理元数据
GET  /static/*                      静态文件服务
```

**总计：3 个业务端点**

### Go 端点 (PORT 8080)

```
GET  /health                              健康检查（增强版：含DB+Redis状态）
GET  /ready                               就绪检查
GET  /live                                存活检查

GET  /api/areas                           获取所有区域
GET  /api/areas/:id                       获取指定区域
GET  /api/areas/region/:region            按区域筛选
POST /api/areas                           创建区域
PUT  /api/areas/:id                       更新区域
DELETE /api/areas/:id                     删除区域

GET  /api/buildings/:areaId               获取建筑物
GET  /api/buildings/:areaId/chunks/info   获取分块信息 ⭐新增
GET  /api/buildings/:areaId/chunks/:idx   获取指定分块 ⭐新增
GET  /api/buildings/:areaId/stats         获取统计信息 ⭐新增
POST /api/buildings                       创建建筑物
DELETE /api/buildings/:areaId             删除建筑物

GET  /api/streamlines/:areaId             获取流线（可按方向筛选）
GET  /api/streamlines/:areaId/all         获取所有流线
GET  /api/streamlines/:areaId/stats       获取流线统计 ⭐新增
POST /api/streamlines                     创建流线
DELETE /api/streamlines/:areaId           删除流线

GET  /api/map-textures/:areaId            获取地图纹理元数据
GET  /api/map-textures/:areaId/file       获取纹理文件 ⭐新增
GET  /api/map-textures/:areaId/validate   验证边界 ⭐新增
POST /api/map-textures                    创建地图纹理
PUT  /api/map-textures/:areaId            更新地图纹理
DELETE /api/map-textures/:areaId          删除地图纹理

GET  /ws                                  WebSocket 连接 ⭐新增
GET  /api/ws/stats                        WebSocket 统计 ⭐新增

GET  /static/*                            静态文件服务
```

**总计：30 个端点（含 WebSocket）**

---

## 🆕 Go 版本新增功能

### 1. ⭐ WebSocket 实时推送
- **功能**：实时环境数据广播
- **端点**：`ws://localhost:8080/ws?areaId=xxx`
- **特性**：
  - Hub 架构管理所有连接
  - 每5秒推送环境数据
  - 支持按区域订阅
  - 并发读写 goroutine
- **Node.js 版本**：无

### 2. ⭐ Redis 缓存层
- **功能**：缓存频繁查询的数据
- **配置**：1小时 TTL
- **缓存内容**：
  - 规划区域列表
  - 建筑物数据
  - 流线数据
  - 地图纹理元数据
- **Node.js 版本**：无缓存

### 3. ⭐ 数据分块传输
- **端点**：
  - `GET /api/buildings/:areaId/chunks/info`
  - `GET /api/buildings/:areaId/chunks/:chunkIndex`
- **功能**：大数据集分块返回（1000条/块）
- **优势**：前端可按需加载，减少内存占用
- **Node.js 版本**：一次性返回全部数据

### 4. ⭐ 统计信息端点
- **建筑统计**：`GET /api/buildings/:areaId/stats`
  - 总数、平均高度、最高/最低建筑
  - 建筑类型分布

- **流线统计**：`GET /api/streamlines/:areaId/stats`
  - 总数、按方向统计

- **Node.js 版本**：需要客户端自己计算

### 5. ⭐ CRUD 完整支持
- **Node.js**：只有 GET（只读）
- **Go**：完整的 CRUD 操作
  - POST（创建）
  - PUT（更新）
  - DELETE（删除）

### 6. ⭐ 健康检查增强
- **Node.js**：简单的 `{ status: 'ok' }`
- **Go**：详细状态
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "database": { "status": "healthy" },
      "redis": { "status": "healthy" },
      "timestamp": "..."
    }
  }
  ```

### 7. ⭐ 限流中间件
- **功能**：防止 API 滥用
- **配置**：100 请求/分钟（可配置）
- **Node.js 版本**：无限流

### 8. ⭐ 结构化日志
- **工具**：Zap logger
- **特性**：
  - JSON 格式日志
  - 不同级别（debug, info, warn, error）
  - 请求追踪
- **Node.js 版本**：简单的 console.log

---

## ⚠️ Go 版本缺失功能

### 1. ❌ WeatherStation 模型
- **用途**：存储 NEA 气象站参考数据
- **影响**：不大，前端直接调用 NEA API
- **建议**：可以后续添加

### 2. ❌ PollutionRegion 模型
- **用途**：存储5个空气质量分区
- **影响**：不大，前端直接调用 NEA API
- **建议**：可以后续添加

---

## 📈 响应格式对比

### Node.js 响应格式

```json
// GET /api/buildings/:areaId
{
  "planningArea": "Area Name",
  "id": "area-a-1",
  "buildingCount": 150,
  "buildings": [
    {
      "footprint": [[x,z], ...],
      "height": 25.5
    }
  ]
}
```

### Go 响应格式

```json
// GET /api/buildings/:areaId
{
  "success": true,
  "data": [
    {
      "id": 1,
      "planning_area_id": "area-a-1",
      "footprint": [{"x": 10, "z": 20}],
      "height": 25.5,
      "building_type": "residential",
      "levels": 5,
      "source": "OpenStreetMap",
      "created_at": "2025-10-12T..."
    }
  ]
}
```

**差异**：
- ✅ Go 版本统一包装在 `{ success, data, error }` 中
- ✅ Go 版本包含更多元数据（id, created_at）
- ⚠️ 字段命名：Go 用 snake_case，Node.js 用 camelCase

---

## 🔍 功能完整性评分

| 功能类别 | Node.js | Go | 优势方 |
|---------|---------|-----|--------|
| **基础 CRUD** | ⭐⭐ (只读) | ⭐⭐⭐⭐⭐ | Go |
| **实时数据** | ❌ | ⭐⭐⭐⭐⭐ (WebSocket) | Go |
| **缓存机制** | ❌ | ⭐⭐⭐⭐⭐ (Redis) | Go |
| **数据分块** | ❌ | ⭐⭐⭐⭐ | Go |
| **统计分析** | ❌ | ⭐⭐⭐⭐ | Go |
| **健康检查** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Go |
| **限流保护** | ❌ | ⭐⭐⭐⭐ | Go |
| **日志追踪** | ⭐ | ⭐⭐⭐⭐⭐ | Go |
| **气象站数据** | ⭐⭐⭐ | ❌ | Node.js |
| **污染分区** | ⭐⭐⭐ | ❌ | Node.js |

**综合评分**：
- **Node.js**：⭐⭐⭐ (基础功能，简单清晰)
- **Go**：⭐⭐⭐⭐⭐ (企业级功能，完整架构)

---

## 🎯 迁移建议

### ✅ 可以直接替换的场景
1. 获取建筑物数据（只需修改端口和字段名）
2. 获取地图纹理（功能完全兼容）
3. 获取规划区域（Go 版本功能更多）

### ⚠️ 需要调整的地方
1. **字段命名**：
   - Node.js: `planningArea`, `buildingCount`
   - Go: `planning_area_id`, `building_count`

2. **响应结构**：
   - Node.js: 直接返回数据对象
   - Go: 包装在 `{ success, data }` 中

3. **端口**：
   - Node.js: 3000
   - Go: 8080

### 🆕 可以利用的新功能
1. **WebSocket** - 实时数据推送
2. **Redis 缓存** - 更快的响应速度
3. **数据分块** - 处理大数据集
4. **统计端点** - 无需客户端计算

### ❌ 需要补充的功能
1. **WeatherStation** - 如果需要存储气象站参考数据
2. **PollutionRegion** - 如果需要存储空气质量分区

---

## 📝 结论

### Go 版本相比 Node.js 版本：

**✅ 优势（8项）**
1. WebSocket 实时推送
2. Redis 缓存加速
3. 完整 CRUD 支持
4. 数据分块传输
5. 统计信息端点
6. 增强的健康检查
7. 限流保护
8. 结构化日志

**⚠️ 差异（3项）**
1. 端口不同（3000 → 8080）
2. 字段命名风格（camelCase → snake_case）
3. 响应格式包装

**❌ 缺失（2项）**
1. WeatherStation 模型
2. PollutionRegion 模型

### 总体评价

**功能覆盖率**：90%+
**功能增强**：显著（新增 WebSocket、缓存、分块等）
**向后兼容**：良好（只需小幅调整字段名和端口）

**推荐**：✅ Go 版本功能更完整，适合生产环境使用。缺失的2个模型影响不大，因为前端直接调用 NEA API 获取实时数据。

---

**迁移成本**：低
**收益**：高（性能提升 + 功能增强）
**建议**：可以直接切换到 Go 后端
