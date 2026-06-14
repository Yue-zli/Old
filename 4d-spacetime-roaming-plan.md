# 4D 时空漫游 — 前端实现计划

## Context

当前 BigScreen 的时间轴播放功能存在三个核心缺陷：
1. `MapContainer` 用 DOM Marker 循环渲染，每 150ms 全量销毁重建 → 卡顿
2. `usePlayback.js` 用滑动时间窗而非时间桶，帧数与数据量无关（硬编码 100 帧）
3. `PlaybackPanel` 缺少可拖拽滑块，直方图与进度条分离

用户要求实现真正的"4D 时空漫游"：时间桶索引 → 柱状图+滑块叠加 UI → 定时器驱动的播放引擎 → WebGL MassMarks + 拖尾光晕效果。

**后端已就绪**：`/api/stat/service/animation-data` 返回全量订单（`publishTime` ISO-8601 字符串，`rLat/rLng` 坐标），前端负责所有时间切片。

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/hooks/useSpacetimePreprocess.js` | 时间桶预处理引擎（Step 1） |
| **新建** | `src/hooks/useSpacetimePlayer.js` | 定时器+状态机播放引擎（Step 3） |
| **新建** | `src/components/dashboard/TimelinePlayer.vue` | 柱状图+滑块+工具提示三层叠加 UI（Step 2） |
| **修改** | `src/api/stat.js` | 新增 `getAnimationData()` 端点函数 |
| **修改** | `src/components/dashboard/MapContainer.vue` | 加载 MassMarks 插件 + 拖尾渲染（Step 4） |
| **修改** | `src/hooks/useDashboardState.js` | 集成新 hook，替换 usePlayback |
| **修改** | `src/views/BigScreen.vue` | TimelinePlayer 替换 PlaybackPanel，更新 props/events |
| **保留（废弃）** | `src/hooks/usePlayback.js` | 保留文件，不再被引用 |
| **保留（废弃）** | `src/components/dashboard/PlaybackPanel.vue` | 保留文件，不再被渲染 |

---

## Step 1: 时间桶预处理 — `useSpacetimePreprocess.js`

### Interface
```js
export function useSpacetimePreprocess()
// Returns:
// {
//   bucketMap: Ref<Map<string, Order[]>>,  // '2025-06-01' → [order1, order2, ...]
//   timeAxisKeys: Ref<string[]>,            // 连续时间轴刻度
//   orderCountPerBucket: Ref<number[]>,      // 每桶订单数（供直方图）
//   rawOrders: Ref<Order[]>,                // 原始订单列表
//   dateRange: Ref<{min: Date, max: Date}>,
//   isLoading: Ref<boolean>,
//   error: Ref<string|null>,
//   fetchAndPreprocess: () => Promise<void>,
//   recomputeBuckets: (scale: 'day'|'week'|'month') => void
// }
```

### 核心逻辑
1. `fetchAndPreprocess()` 调用 `getAnimationData()`，解析 `publishTime` 为 Date 对象
2. 确定全局 min/max 日期范围
3. 根据 `scale` 生成连续时间轴 key：
   - `day`: `'YYYY-MM-DD'`
   - `week`: `'YYYY-Www'`（ISO 周）
   - `month`: `'YYYY-MM'`
4. 遍历订单 → 分桶 → 构建 `Map<string, Order[]>`
5. **关键优化**：`recomputeBuckets(scale)` 不重新请求 API，仅对内存中的 `rawOrders` 重新分桶

### 依赖
- `src/api/stat.js` 新增的 `getAnimationData()`

---

## Step 2: 时间轴 UI — `TimelinePlayer.vue`

### 三层绝对定位叠加
```
┌────────────────────────────────────────────┐
│  Layer 3: <input type="range">  透明滑块    │  z-index: 3
│  Layer 2: 高亮染色 div（随进度变宽）         │  z-index: 2
│  Layer 1: ECharts 柱状图（暗蓝底柱）         │  z-index: 1
│  容器: position: relative, height ~100px     │
└────────────────────────────────────────────┘
```

### Props
| Prop | 类型 | 来源 |
|------|------|------|
| `isPlaying` | Boolean | useSpacetimePlayer |
| `playProgress` | Number (0-100) | useSpacetimePlayer |
| `currentTimeLabel` | String | useSpacetimePlayer |
| `timeAxisKeys` | Array\<string\> | useSpacetimePreprocess |
| `orderCountPerBucket` | Array\<number\> | useSpacetimePreprocess |
| `currentIndex` | Number | useSpacetimePlayer |
| `scale` | String | useDashboardState.playbackScale |
| `scaleMap` | Object | useDashboardState.scaleMap |

### Emits
`play`, `pause`, `stop`, `seek(index)`, `change-scale(key)`

### Layer 1 — ECharts 配置
- `barWidth: '100%'`, `barGap: 0`, `barCategoryGap: 0` → 柱子无缝连接
- `xAxis: { show: false }`, `yAxis: { show: false }`, `grid: { top:0, bottom:0, left:0, right:0 }`
- `itemStyle: { color: '#1e3a5f' }`（暗蓝色）
- 监听 `orderCountPerBucket` 变化 → `chart.setOption()`

### Layer 3 — 自定义滑块
- `-webkit-appearance: none`，`background: transparent`
- 定制 `::-webkit-slider-thumb`：12px 白色圆球 + 发光阴影
- `@input` → `$emit('seek', parseInt(e.target.value))`

### 悬浮提示
- 滑块 `mousemove` → 计算所在桶索引 → 显示浮层 div
- 内容：日期 + 订单总数 + 服务类型分布 Top 3

---

## Step 3: 播放引擎 — `useSpacetimePlayer.js`

### Interface
```js
export function useSpacetimePlayer(bucketMap, timeAxisKeys, speedMs)
// Returns:
// {
//   isPlaying: Ref<boolean>,
//   currentIndex: Ref<number>,
//   currentBucketKey: ComputedRef<string|null>,
//   currentBucketOrders: ComputedRef<Order[]>,
//   playProgress: ComputedRef<number>,      // 0-100
//   currentTimeLabel: ComputedRef<string>,
//   trailingData: ComputedRef<TrailPoint[]>, // 当前帧 + 前 2 帧合并数据
//   play: () => void,
//   pause: () => void,
//   stop: () => void,
//   seek: (index: number) => void,
//   setSpeed: (ms: number) => void
// }
```

### 状态机
```
IDLE → play() → PLAYING → 定时器逐帧推进 currentIndex
PLAYING → pause() → PAUSED（保持 currentIndex）
PLAYING → 到达末尾 → 自动 pause()，标记 FINISHED
PAUSED/FINISHED → stop() → IDLE（currentIndex=0）
ANY → seek(n) → currentIndex=n（不改变播放状态）
```

### 定时器
- `setInterval(() => currentIndex++, speedMs)`（默认 800ms）
- 到达 `timeAxisKeys.length` 末尾时自动暂停
- `pause()` 用 `clearInterval`，不重置 `currentIndex`

### 拖尾数据计算 (trailingData)
```
帧 N（当前）: opacity=1.0, 最大光点
帧 N-1:      opacity=0.5, 中等光点
帧 N-2:      opacity=0.2, 最小光点
→ 按坐标去重，保留最高 opacity
→ 返回数组 [{lng, lat, opacity, raw}, ...]
```
这个 computed 是响应式的——`currentIndex` 变化自动重算。

---

## Step 4: 地图动态渲染 — 修改 `MapContainer.vue`

### 4.1 插件配置（line 46）
```js
plugins: ['AMap.HeatMap', 'AMap.MassMarks']
```

### 4.2 新增 Prop
```ts
trailingData: { type: Array, default: () => [] }
// Array<{ lng: number, lat: number, opacity: number, raw: Order }>
```

### 4.3 MassMarks 初始化（在 initMap 中）
```js
massMarks = new AMap.MassMarks([], { zIndex: 111, cursor: 'pointer' });
massMarks.setStyle([
  { size: [14,14], fillColor: '#38bdf8', fillOpacity: 1.0, strokeWeight: 2, zIndex: 200 },  // 当前帧
  { size: [10,10], fillColor: '#38bdf8', fillOpacity: 0.5, strokeWeight: 1, zIndex: 150 },  // t-1
  { size: [7,7],   fillColor: '#38bdf8', fillOpacity: 0.2, strokeWeight: 0, zIndex: 100 },  // t-2
]);
massMarks.setMap(map);
massMarks.on('click', (e) => { if (e.data?.raw) emit('marker-click', e.data.raw); });
```

### 4.4 渲染逻辑
```js
function updateMassMarks(data) {
  const styledData = data.map(pt => ({
    lnglat: [pt.lng, pt.lat],
    style: pt.opacity <= 0.2 ? 2 : pt.opacity <= 0.5 ? 1 : 0,  // 按 opacity 选 style
    raw: pt.raw
  }));
  massMarks.setData(styledData);  // WebGL 原地更新，无 DOM 操作
}
```

### 4.5 Watch 改动
```js
// 新增 watch：当 trailingData 有数据时走 MassMarks，否则走旧逻辑
watch(() => props.trailingData, (newData) => {
  if (newData?.length > 0) {
    updateMassMarks(newData);
    if (heatmapInstance) heatmapInstance.hide();
  } else {
    massMarks?.clear();
    updateDisplay();  // 回退到 DOM Marker / 热力图
  }
});
```

### 4.6 降级策略
如果 `AMap.MassMarks` 不可用 → 降级到 `AMap.LabelsLayer`（ConvergeAnalysis.vue:287 已验证可用）
如果 LabelsLayer 也不可用 → 回退到现有 DOM Marker 模式（带 opacity CSS 类）

---

## `useDashboardState.js` 集成改动

```js
// 新 import
import { useSpacetimePreprocess } from './useSpacetimePreprocess.js';
import { useSpacetimePlayer } from './useSpacetimePlayer.js';

// 集成预处理
const { bucketMap, timeAxisKeys, orderCountPerBucket, rawOrders,
        isLoading, error, fetchAndPreprocess, recomputeBuckets }
  = useSpacetimePreprocess();

// 集成播放器
const playbackSpeedMs = ref(800);
const { isPlaying, currentIndex, playProgress, currentTimeLabel,
        trailingData, play, pause, stop, seek, setSpeed }
  = useSpacetimePlayer(bucketMap, timeAxisKeys, playbackSpeedMs);

// fetchAll() 改为调用 fetchAndPreprocess()
// 同时填充旧 orders 数组（供 KPI/图表/DetailPanel 向后兼容）

// 新增导出
return {
  ...现有导出,
  timeAxisKeys, orderCountPerBucket, currentIndex, currentTimeLabel,
  trailingData, play, pause, stop, seek, playbackSpeedMs,
  recomputeBuckets
};
```

---

## BigScreen.vue 改动

### 底部栏：PlaybackPanel → TimelinePlayer
```html
<TimelinePlayer
  :isPlaying="isPlaying"
  :playProgress="playProgress"
  :currentTimeLabel="currentTimeLabel"
  :timeAxisKeys="timeAxisKeys"
  :orderCountPerBucket="orderCountPerBucket"
  :currentIndex="currentIndex"
  :scale="playbackScale"
  :scaleMap="scaleMap"
  @play="play" @pause="pause" @stop="stop"
  @seek="seek" @change-scale="handlePlaybackScaleChange"
/>
```

### 地图：新增 trailingData prop
```html
<MapContainer
  :services="displayOrders"
  :trailingData="trailingData"
  :heatmap="heatmap"
  @marker-click="openDetail"
/>
```

---

## 数据流总览

```
API: getAnimationData()
  │
  ▼
useSpacetimePreprocess.fetchAndPreprocess()
  ├─ rawOrders (全量)
  ├─ bucketMap: Map<'2025-06-01' → [orders]>
  ├─ timeAxisKeys: ['2025-06-01', '2025-06-02', ...]
  └─ orderCountPerBucket: [47, 32, ...]
        │                    │
        ▼                    ▼
  TimelinePlayer         useSpacetimePlayer
  (柱状图+滑块)           (定时器+状态机)
        │                    │
        │ seek(index) ──────→ currentIndex
        │                    │
        │              trailingData (computed)
        │              [{lng, lat, opacity, raw}, ...]
        │                    │
        ▼                    ▼
   用户拖动滑块      MapContainer.updateMassMarks()
                           │
                     massMarks.setData()
                     (WebGL 原地更新，60fps)
```

---

## 验证方式

1. **分桶正确性**：打开浏览器 console，检查 `bucketMap`、`timeAxisKeys`、`orderCountPerBucket` 数据
2. **直方图渲染**：TimelinePlayer 底部柱状图与数据匹配
3. **滑块拖拽**：拖动滑块 → 地图光点更新 → 拖尾效果可见（3 层不同大小/透明度）
4. **播放流畅**：点击播放 → 800ms 每帧 → 光点平滑移动 → 到达末尾自动暂停
5. **缩放切换**：日→周→月 → 柱子合并 → currentIndex 重置
6. **向后兼容**：KPI 卡片、图表、DetailPanel、热力图切换均正常
7. **降级测试**：注释掉 MassMarks 插件 → 自动回退到 LabelsLayer → 再回退到 DOM Marker

---

## 实现顺序

1. `src/api/stat.js` — 新增 `getAnimationData()`
2. `src/hooks/useSpacetimePreprocess.js` — 时间桶引擎
3. `src/hooks/useSpacetimePlayer.js` — 播放引擎
4. `src/hooks/useDashboardState.js` — 集成新 hook
5. `src/components/dashboard/TimelinePlayer.vue` — 时间轴 UI
6. `src/components/dashboard/MapContainer.vue` — MassMarks 渲染
7. `src/views/BigScreen.vue` — 最终接线
