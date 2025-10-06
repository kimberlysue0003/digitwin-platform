# Error Memo: 2D/3D Alignment Issue

## 问题描述

**日期**: 2025-10-06

**问题**: 非西部区域（除choa-chu-kang外的42个区域）的2D地图和3D建筑模型无法对齐，存在明显的位置偏移和比例不匹配。

**现象**:
- 3D建筑模型相对于2D地图有明显偏移
- 中心点不对齐
- 整体比例偏小
- 边界不匹配

## 错误历程

### 错误1: 修改了不该修改的数据 ❌

**操作**: 创建 `update-map-bounds-from-geometry.js`，试图更新所有54个区域的bounds

**错误**:
```javascript
// 错误地更新了ALL区域，包括已经正确对齐的西部区域
const ALL_AREAS = [...]; // 54个区域
for (const area of ALL_AREAS) {
  // 更新bounds从geometry计算
}
```

**用户反馈**:
> "不是啊，干嘛改我的choa chu kang和西部的数据啊？？都改乱了！！！！也没对齐也没改进，全部给我回退"

**教训**:
- 必须明确区分西部区域（已对齐）和非西部区域（待修复）
- 创建 `WEST_AREAS` 排除列表，包含12个西部区域

**修复**: 使用 `git revert` 回退所有修改

---

### 错误2: 使用了geometry center而非bounds center ❌

**操作**: 创建多个脚本尝试重新计算中心点

**错误做法**:
```javascript
// fix-non-west-alignment.js
// refetch-non-west-correct.js

// 错误：使用geometry的中心点
function getGeometryCenter(geometry) {
  let sumLat = 0, sumLng = 0, count = 0;
  // 遍历所有多边形点计算平均值
  // ...
  return [sumLat/count, sumLng/count];
}

const centerLat = geometryCenter[0];
const centerLng = geometryCenter[1];
```

**用户反馈**:
> "还是不对，非西部区域3D还是有偏移，中心点对齐了吗？3D的数据确定是正确的？"

**问题本质**: geometry center（几何中心）≠ bounds center（边界中心）

---

### 错误3: 2D地图未裁剪到多边形形状 ❌

**操作**: 使用 `regenerate-non-west-maps.js` 重新生成2D地图

**错误**:
```javascript
// 只是简单截图，没有polygon clipping
const screenshot = await page.screenshot({ type: 'png' });
fs.writeFileSync(outputPath, screenshot);
```

**现象**:
- choa-chu-kang.png: 1.7MB（有透明区域，多边形裁剪）
- ang-mo-kio.png: 4.4MB（矩形，无裁剪）

**用户反馈**:
> "还是不对，但我感觉是不是非西部区域你2D切的有问题啊？有的跟总体地图的边界不一样"

---

### 错误4: 2D地图的bounds与3D建筑的bounds不一致 ❌

**发现**: 查看metadata时发现关键问题

**ang-mo-kio.json (错误的)**:
```json
{
  "bounds": [
    [1.355512, 103.816736],  // 从geometry计算的bounds
    [1.397743, 103.860927]
  ],
  "originalBounds": [
    [1.355, 103.83],  // ⚠️ 旧的四舍五入bounds
    [1.385, 103.86]
  ]
}
```

**问题**:
- 2D地图PNG是用旧的rounded bounds生成的
- 3D建筑是用新的precise geometry bounds生成的
- 两者使用的坐标系统不同！

---

## 正确方案：参考choa-chu-kang的实现 ✅

### 关键发现1: bounds center的正确计算方式

**查看 `fetchRealBuildingsChoaChuKang.js`**:

```javascript
// Line 79-80: 关键代码！
const centerLat = (minLat + maxLat) / 2;
const centerLng = (minLng + maxLng) / 2;
```

**重要发现**: choa-chu-kang使用的是**bounds center（边界中心）**，不是geometry center！

---

### 关键发现2: 2D地图需要polygon clipping

**查看 `captureChoaChuKangWithClipping.js`**:

```javascript
// Step 1: 获取Leaflet的actualBounds
const actualBounds = map.getBounds();
window.actualBounds = {
  south: actualBounds.getSouth(),
  north: actualBounds.getNorth(),
  west: actualBounds.getWest(),
  east: actualBounds.getEast()
};

// Step 2: 截图
const screenshot = await page.screenshot({ type: 'png' });

// Step 3: Polygon clipping (关键步骤！)
const canvas = createCanvas(2048, 2048);
const ctx = canvas.getContext('2d');
const img = await loadImage(screenshot);

// 转换多边形坐标到屏幕坐标
const latToY = (lat) => {
  const latRange = actualBounds.north - actualBounds.south;
  return size - ((lat - actualBounds.south) / latRange) * size;
};

const lngToX = (lng) => {
  const lngRange = actualBounds.east - actualBounds.west;
  return ((lng - actualBounds.west) / lngRange) * size;
};

// 裁剪
ctx.clearRect(0, 0, 2048, 2048);
ctx.beginPath();
polygonScreenCoords.forEach((coord, i) => {
  if (i === 0) ctx.moveTo(coord[0], coord[1]);
  else ctx.lineTo(coord[0], coord[1]);
});
ctx.closePath();
ctx.clip();
ctx.drawImage(img, 0, 0);
```

---

### 关键发现3: actualBounds vs originalBounds

**choa-chu-kang.json (正确的)**:
```json
{
  "bounds": [
    [1.365308, 103.724971],  // ✅ actualBounds from Leaflet
    [1.409241, 103.768916]
  ],
  "originalBounds": [
    [1.36905, 103.732667],   // geometry bounds (仅供参考)
    [1.40549, 103.761240]
  ]
}
```

**核心原理**:
1. **actualBounds**: Leaflet `fitBounds()` 后实际使用的边界
   - 可能比input bounds更大（为了适应地图纵横比）
   - 这才是地图PNG真正对应的坐标范围

2. **originalBounds**: 从geometry计算的边界
   - 仅作为参考
   - 不应用于坐标转换

---

## 正确的解决方案

### 步骤1: 重新生成2D地图（带polygon clipping）

```javascript
// batchCaptureNonWestWithClipping.js

// 1. Leaflet渲染地图
map.fitBounds(bounds);
map.setZoom(15);

// 2. 获取actualBounds
const actualBounds = await page.evaluate(() => window.actualBounds);

// 3. 截图
const screenshot = await page.screenshot({ type: 'png' });

// 4. Polygon clipping
const canvas = createCanvas(2048, 2048);
const ctx = canvas.getContext('2d');
ctx.clip(); // 裁剪到多边形
ctx.drawImage(img, 0, 0);

// 5. 保存metadata
const metadata = {
  bounds: actualBounds,  // ✅ 使用actualBounds
  originalBounds: geometry.bounds,  // 仅供参考
  geometry: geometry
};
```

### 步骤2: 重新获取3D建筑（使用actualBounds）

```javascript
// refetchBuildingsWithMapBounds.js

// 1. 加载2D地图的metadata
const mapMetadata = JSON.parse(fs.readFileSync(mapMetadataPath));
const [[minLat, minLng], [maxLat, maxLng]] = mapMetadata.bounds;  // ✅ actualBounds

// 2. 使用相同的center计算方式
const centerLat = (minLat + maxLat) / 2;
const centerLng = (minLng + maxLng) / 2;
const scale = 111000;

// 3. 坐标转换
function toLocal(lat, lng) {
  const x = (lng - centerLng) * scale;
  const z = (lat - centerLat) * scale;
  return [x, z];
}

// 4. 保存建筑数据
const outputData = {
  buildings: buildings,
  metadata: {
    bounds: mapMetadata.bounds,  // ✅ 使用actualBounds
    center: [centerLat, centerLng],
    note: 'Coordinates aligned with map texture bounds'
  }
};
```

### 步骤3: 前端无需特殊处理

```typescript
// GroundMapLayer.tsx

// 简单的position计算即可
<mesh
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, 0, 0]}  // ✅ 不需要额外offset
  receiveShadow
>
```

---

## 核心要点总结

### ✅ 必须做的事：

1. **统一坐标系统**
   - 2D地图和3D建筑必须使用**相同的bounds**
   - 这个bounds是**actualBounds**（从Leaflet获取），不是geometry bounds

2. **统一中心点计算**
   ```javascript
   const centerLat = (minLat + maxLat) / 2;
   const centerLng = (minLng + maxLng) / 2;
   ```
   - 使用bounds center，不是geometry center
   - 2D和3D必须使用相同的center

3. **Polygon clipping**
   - 2D地图必须裁剪到planning area的多边形形状
   - 使用Canvas API的clip()功能
   - 创建透明区域在多边形外

4. **数据流程**
   ```
   geometry → Leaflet fitBounds → actualBounds
                                       ↓
                               2D map (with clipping)
                                       ↓
                               actualBounds metadata
                                       ↓
                               3D buildings (same bounds)
   ```

### ❌ 容易犯的错误：

1. ❌ 使用geometry center而非bounds center
2. ❌ 2D地图不做polygon clipping（矩形截图）
3. ❌ 2D地图用一套bounds，3D建筑用另一套bounds
4. ❌ 修改已经正确对齐的区域数据
5. ❌ 使用rounded/approximate bounds而非precise bounds

---

## 测试验证方法

### 1. 检查文件大小
```bash
ls -lh public/map-textures/*.png
```
- 有polygon clipping的地图会比矩形截图小（有透明区域）
- choa-chu-kang.png: 1.7MB ✅
- ang-mo-kio.png (before): 4.4MB ❌
- ang-mo-kio.png (after): 924KB ✅

### 2. 检查metadata的bounds
```javascript
// 检查是否有actualBounds
const metadata = require('./map-textures/ang-mo-kio.json');
console.log('bounds:', metadata.bounds);
console.log('originalBounds:', metadata.originalBounds);

// bounds应该比originalBounds略大或不同
```

### 3. 检查建筑数据的center
```javascript
const buildings = require('./buildings/ang-mo-kio.json');
const mapMeta = require('./map-textures/ang-mo-kio.json');

// 两者的center应该相同或非常接近
console.log('Building center:', buildings.metadata.center);
console.log('Map center:', mapMeta.center);
```

### 4. 浏览器中直观检查
- 3D建筑应该精确覆盖在2D地图的建筑轮廓上
- 边界应该完全匹配planning area的形状
- 无明显偏移或比例问题

---

## 工具和脚本

### 可复用模块 (scripts/lib/)

1. **mapCaptureWithClipping.js**
   - 2D地图生成
   - 自动获取actualBounds
   - Polygon clipping

2. **buildingDataFetcher.js**
   - 3D建筑数据获取
   - 从map metadata加载actualBounds
   - 统一坐标转换

### 统一批处理工具

```bash
# 重新生成2D和3D数据
node regenerateAreaData.js ang-mo-kio

# 只重新生成2D地图
node regenerateAreaData.js --maps-only ang-mo-kio

# 只重新生成3D建筑
node regenerateAreaData.js --buildings-only ang-mo-kio

# 处理所有区域
node regenerateAreaData.js all
```

---

## 最终结果

✅ **成功修复所有54个规划区域的2D/3D对齐问题**

- 41个非西部区域：重新生成2D地图（带clipping）+ 重新获取3D建筑（使用actualBounds）
- 12个西部区域：保持不变（已经正确）
- 1个区域（choa-chu-kang）：作为参考标准

**数据统计**:
- 重新生成的2D地图：41个PNG文件
- 更新的map metadata：41个JSON文件
- 重新获取的建筑数据：41个JSON文件
- 新增区域：marina-east（之前缺失）

**代码质量提升**:
- 模块化、可复用的工具链
- 完整的文档和使用说明
- 统一的批处理脚本

---

## 经验教训

1. **对齐问题的本质是坐标系统不统一**
   - 不仅仅是center的问题
   - bounds、center、scale都必须统一

2. **Leaflet的actualBounds是关键**
   - fitBounds后的实际边界可能与输入不同
   - 必须使用actualBounds进行所有坐标计算

3. **参考已经正确的实现**
   - choa-chu-kang作为golden standard
   - 逐行对比代码找出差异

4. **测试先行**
   - 先修复一个区域（ang-mo-kio）
   - 确认正确后再批量处理
   - 避免批量破坏数据

5. **版本控制很重要**
   - 及时commit和revert
   - 保留错误尝试的历史
   - 方便回退和对比

---

## 参考文件

- ✅ 正确的实现: `digitwin-frontend/scripts/fetchRealBuildingsChoaChuKang.js`
- ✅ 正确的实现: `digitwin-frontend/scripts/captureChoaChuKangWithClipping.js`
- ✅ 重构后的模块: `digitwin-frontend/scripts/lib/mapCaptureWithClipping.js`
- ✅ 重构后的模块: `digitwin-frontend/scripts/lib/buildingDataFetcher.js`
- ✅ 统一工具: `digitwin-frontend/scripts/regenerateAreaData.js`
- 📚 完整文档: `digitwin-frontend/scripts/README.md`

---

**记录人**: Claude
**日期**: 2025-10-06
**提交**: e14aa61 - "Fix 2D/3D alignment and refactor map generation tools"
