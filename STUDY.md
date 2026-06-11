#养老系统

##1.后端数据传输逻辑
const base='/api/stat' 接口前缀

（1）async关键字：告诉浏览器，异步处理数据，需要等待
（2）await 在函数内部 运行这一段代码得到结果，走下一行
await.axios.get(url,{ params }) // 即拿到路径，进行下一步 
（3）export  将变量、函数打包，允许其他文件使用
export async function statElderlyAge(breaks) {} 打包statElderlyAge函数



#getData函数
async function getData(url, params = {}) {
  const res = await axios.get(url, { params });  1.url拿到路径，params是传给后端的筛选条件
  if (res && res.data) {
    if (res.data.code && res.data.code !== 200) { 2.拆箱检查
      // 后端统一返回 {code,message,data}
      throw new Error(res.data.message || '后端返回错误');
    }
    return res.data.data ?? null; 
    #??是空值运算符
    #左侧操作数如果是 null 或 undefined，则返回右侧的默认值；
    #否则返回左侧操作数（哪怕左侧是 0、''、false 这些「假值」，也会返回左侧）
    #res:axios请求返回的结果即响应对象
    #res.data 返回的数据
    #res.data.data:真正的业务数据
  }
  throw new Error('无响应');
}
e.g.
{
  "code": 200,  //200就是res.data.code
  "data": [
    {
      "name": "男性",
      "value": 23
    },
    {
      "name": "女性",
      "value": 22
    }
  ], //数组即res.data.data
  "message": "成功"  //res.data.message
}

##2.数据绑定与渲染
onMounted :页面开始加载时就会运行的函数
onMounted(() => {
  fetchAll();
  window.addEventListener('resize', () => {  //窗口自适应监听
    ageE?.resize(); genderE?.resize(); typeE?.resize(); hourE?.resize();  //?.保证安全性，防止对null对象进行属性访问
  });
});

onBeforeUnmount:在销毁页面时清理
onBeforeUnmount(() => {
  ageE?.dispose(); genderE?.dispose(); typeE?.dispose(); hourE?.dispose();
});


ref
(1)ref 是 Vue 3 组合式 API (Composition API) 中用于定义响应式数据的核心函数。
    技术定义：ref 接收一个内部值并返回一个响应式的、可变的 Ref 对象。该对象只有一个 .value 属性，指向内部值。
    核心原理：Vue 通过依赖追踪机制，监听 ref 对象 .value 属性的变化。当数据发生变更时，Vue 会自动触发与之关联的视图（DOM）更新。
(2)使用规范
    初始化：通过 const 变量名 = ref(初始值); 进行声明。
    例如：const orders = ref([]); // 声明一个初始为空数组的响应式状态
    逻辑层访问（Script）：在 <script setup> 逻辑中，必须通过 .value 属性访问或修改数据。
    例如：orders.value = list; // 将获取的数据赋值给响应式对象
    视图层访问（Template）：在 <template> 模板中，Vue 会自动执行“解包”操作，无需使用 .value。


例如：{{ orders.length }} // 直接引用变量名即可获取长度

**大屏渲染流程
a.挂载：页面打开，触发 onMounted。
b.请求：fetchAll 派 stat.js 出去拿数据（Axios）。
c.清洗：把后端给的 res.data.data 整理成 Vue 和 Echarts 认识的格式。
d.上架：通过 .value 给响应式变量赋值，画面自动刷新。


---

# 2026-06-10 全流程修改笔记

## 一、Git 基础操作

### 1.1 安全改代码：先建分支

```bash
git checkout -b feature/test-changes   # 建新分支，改坏可切回 main
git checkout main                       # 切回主分支，一切恢复原样
```

### 1.2 查看状态和历史

```bash
git status                   # 看当前改了哪些文件
git diff                     # 看具体改了什么内容
git log --oneline            # 简洁提交历史
git show <hash>              # 看某次提交的详情
git log -p <文件名>          # 看某个文件的提交历史
```

### 1.3 diff 格式解读

| 符号 | 含义 |
|---|---|
| `--- a/xxx` | 旧文件 |
| `+++ b/xxx` | 新文件 |
| `@@ -65,9 +65,9 @@` | 旧第65行起9行 → 新第65行起9行 |
| `-` 红色 | 被删的代码 |
| `+` 绿色 | 新增的代码 |

### 1.4 提交和推送

```bash
git add <文件>                              # 加入暂存区
git commit -m "feat: 描述"                   # 提交到本地
git remote add origin <GitHub仓库地址>        # 关联远程
git push -u origin main                      # 推送
```

### 1.5 回退操作

| 场景 | 命令 |
|---|---|
| 没 add，撤销修改 | `git restore <文件>` |
| 已 add 但没 commit | `git restore --staged <文件>` |
| 已 commit，保留修改 | `git reset --soft HEAD~1` |
| 已 commit，全部丢弃 | `git reset --hard HEAD~1` |

### 1.6 .gitignore 写法

```gitignore
node_modules/
dist/
.vite/
*.local
.env
```

---

## 二、Mattpocock Skills 安装

```bash
git clone https://github.com/mattpocock/skills.git
npx skills@latest add mattpocock/skills
```

安装后 29 个 skills 出现在 `.agents/skills/` 下。

### improve-codebase-architecture 工作流程

| 阶段 | 做什么 |
|---|---|
| ① 探索 | 遍历代码库找架构摩擦 |
| ② HTML报告 | Mermaid图表 + 前后对比卡片 |
| ③ 追问 | 选一个重构项深入讨论 |

---

## 三、Bug 修复

### 3.1 Cards.vue Props 不匹配（已修）

**问题**：BigScreen 传 `:orders="orders"`(Array)，Cards 声明 `ordersCount: Number`，
三个卡片值永远是 0。

**修复**：Cards 改为接收数组，内部用 `.length`。

```js
// 改之前
defineProps({ ordersCount: Number, ... })
cardConfig: [{ value: props.ordersCount }, ...]

// 改之后
defineProps({
  orders: { type: Array, default: () => [] },
  managers: { type: Array, default: () => [] },
  volunteers: { type: Array, default: () => [] },
})
cardConfig: [{ value: props.orders.length }, ...]
```

### 3.2 MapContainer.vue 死代码（已修）

| 问题 | 处理 |
|---|---|
| `stopPlayback()` 引用4个未声明变量 | 删除 6 行 |
| `updateDisplay()` 重复初始化热力图 | 删除 9 行 |

---

## 四、地图可视化改造

### 4.1 邻避→道路环境影响带（面状要素）

**原理**：按道路名分组出入口 → 连成线 → `turf.buffer` 缓冲成面。

```js
// 按道路名分组
const roadGroups = {};
nimbyFeatures.features.forEach(item => {
  const roadName = item.properties.name.split(/出口|入口|与|交叉口/)[0].trim();
  roadGroups[roadName].push(item.geometry.coordinates);
});

// 多点→缓冲面
if (coords.length >= 2) {
  const line = turf.lineString(coords);
  const buffer = turf.buffer(line, 0.3, { units: 'kilometers' });
  new AMap.Polygon({ path: buffer.geometry.coordinates[0], ... });
}
```

**文案改动**：

| 原 | 改 |
|---|---|
| ⚠️ 环境风险 (邻避) 惩罚 | 🛣️ 高架/快速路环境影响 |
| ⚠️ 邻避风险：警报(距XXm) | 🛣️ 道路环境影响：附近 XXm 有高架/快速路 |
| C级高危：环境风险过高 | C级高危：道路环境影响较大 |

### 4.2 公园数据问题

`nanchang_parks.json` 91 个点中仅 1 个是真正的"公园广场"，
其余 80 个是体育场馆（篮球公园、足球公园等）。
**根本解法**：用正确的高德分类码重新获取数据。

---

## 五、赣江多分支排除 ⚠️ 重要

### 5.1 大坑：turf.union 不重叠就返回 null

```js
// ❌ 错误 — 不重叠时 rivers 变成 null
let rivers = riverMain;
rivers = turf.union(rivers, riverBranch1);

// ✅ 正确 — 用数组逐个判断
const riverZones = [riverMain, riverBranch1, riverBranch2, ...];
const isExcluded = riverZones.some(z => turf.booleanPointInPolygon(pt, z));
```

### 5.2 最终结构

```
赣江主河道 (10点, 0.65km)
├── 分支1   (8点,  0.50km)
├── 分支2   (3点,  0.50km)
├── 分支2.1 (6点,  0.40km)
└── 支线2.2 (8点,  0.35km)
```

缓冲逐级递减。以后加新分支只需：
```js
const riverNew = turf.buffer(turf.lineString([...]), 0.5, { units: 'kilometers' });
// 然后把 riverNew 加到 riverZones 数组里
```

---

## 六、文件变更汇总

| 文件 | 改动 |
|---|---|
| `.gitignore` | 新建 |
| `src/components/Cards.vue` | Props Number→Array |
| `src/components/MapContainer.vue` | 删 15 行死代码 |
| `src/views/ConvergeAnalysis.vue` | 邻避面状+文案+赣江多分支 |
| `architecture-review.html` | 架构报告（E盘非C盘） |

---

## 七、踩过的坑

| 坑 | 教训 |
|---|---|
| PowerShell 中文在 bash 里乱码 | 用英文参数名 |
| `turf.union` 不重叠返回 null | 用数组 + `.some()` 逐判 |
| AMap.Marker div 不显示 | 加 `display:inline-block;font-size:0` |
| `git restore` 撤销所有未提交修改 | 改前先 commit |
| 编辑弯引号匹配失败 | 从 Grep 输出复制原始字符 |
| PowerShell Set-Content -NoNewline 破坏文件 | 用 git restore 恢复后重改 |
| 漏写变量声明导致 ReferenceError | 每次改完检查 let/const 是否完整 |


---

# 2026-06-11 地图四要素可视化改造

## 一、四要素统一简约方案

| 要素 | 形状 | 颜色 | 实现 |
|---|---|---|---|
| 🏥 医疗设施 | 青色圆点 r=4 | `#22d3ee` | `AMap.CircleMarker` |
| 🌳 公园 | 绿色实心方块 10x10 | `#10b981` | `AMap.Marker` + div |
| 🚇 地铁 | 蓝色服务区面 | `#38bdf8` | `AMap.Polygon` (凸包+缓冲) |
| 🛣️ 道路环境 | 红色影响带面 | `#ef4444` | `AMap.Polygon` (连线+缓冲) |

## 二、地铁：散点 → 面状服务区

### 2.1 站名清洗（最重要）

数据里同名站有 4 种不同写法，必须统一清洗再聚合：

```js
let baseName = rawName
  .replace(/[\(\（][^)）]*[\)\）]/g, '')   // 去括号 (地铁站) (1号口)
  .replace(/地铁站/g, '')                   // 去 "地铁站"
  .replace(/\d+号口|[A-Z]口/g, '')          // 去 "1号口" "A口"
  .replace(/出入口/g, '')                   // 去 "出入口"
  .trim();
if (!baseName.endsWith('站')) baseName += '站';
```

示例：`高新大道地铁站1号口` / `高新大道(地铁站)` / `高新大道地铁站出入口` → 统一 `高新大道站`

### 2.2 服务区面生成

```
各出口坐标 → 同名聚合 → turf.convex(凸包) → turf.buffer(分级)

出口数      缓冲半径
  1个  →    300m
  2-3个 →   350m
  4+个  →   400m
```

### 2.3 评分改造

```js
// 改之前：0.8km 内数出口散点（多出口站虚高）
const td = getCountInRange(transitFeatures, centerPt, 0.8);

// 改之后：判断网格中心是否落在站点服务区面内（一个站只算一次）
const stationCount = transitPolygons.filter(p =>
  turf.booleanPointInPolygon(currentCenterPt, p)
).length;

score = 65 + Math.min(30, stationCount * 15 * weightTransit) + ...
```

### 2.4 执行顺序修复

`renderEnvironmentLayers()` 必须**先于** `startAnalysis()` 调用，
否则评分时 `transitPolygons` 还是空数组。

## 三、邻避 → 道路环境影响带

### 3.1 聚合逻辑

```js
// 提取道路名："九洲大道高架快速路出口与前湖大道交叉口" → "九洲大道高架快速路"
const roadName = name.split(/出口|入口|与|交叉口/)[0].trim();

// 多点 → 连线缓冲成面；单点 → 红色三角
```

### 3.2 文案去技术术语

| 原 | 改 |
|---|---|
| ⚠️ 环境风险 (邻避) 惩罚 | 🛣️ 高架/快速路环境影响 |
| ⚠️ 邻避风险 | 🛣️ 道路环境影响 |
| C级高危：环境风险过高 | C级高危：道路环境影响较大 |

## 四、赣江多分支排除

### 4.1 大坑：turf.union 不重叠返回 null

```js
// ❌ 错误
let rivers = turf.union(riverMain, riverBranch1); // 不重叠 → null！

// ✅ 正确：数组逐个判断
const riverZones = [main, branch1, branch2, branch21, branch22];
const isExcluded = riverZones.some(z => turf.booleanPointInPolygon(pt, z));
```

### 4.2 最终排除结构

```
赣江主河道 (10点, 0.65km)
├── 分支1   (8点,  0.50km)
├── 分支2   (3点,  0.50km)
├── 分支2.1 (6点,  0.40km)
└── 支线2.2 (8点,  0.35km)
```

## 五、公园数据问题

旧 `nanchang_parks.json` 91 条中仅 1 条真公园，其余是体育场馆。
**根本解法**：用高德分类码 `110101`(公园) 重新爬取 → `real_parks.json`(193 条真公园)。

## 六、图例与 UX

### 6.1 地图图例（右上角）
新增四要素说明 + 评分等级，客户一眼看懂颜色含义。

### 6.2 站名标签
每个地铁服务区面中心显示 `AMap.Text` 站名（深底蓝框）。

### 6.3 评分基础分
保持 65 分不变。河湖山地已排除，大多数格子 B 级反映真实情况即可。

## 七、本次提交

```
78810c9 feat: 地图四要素可视化 + 地铁面状评分 + 赣江多分支 + 真公园数据
```

| 文件 | 改动 |
|---|---|
| `src/views/ConvergeAnalysis.vue` | 四要素渲染+评分+赣江+图例 |
| `src/data/real_parks.json` | 新增，193条真公园数据 |


---

# 思维导图：养老系统大屏项目全流程

```
养老系统大屏项目改造
│
├─ 一、Git 基础
│   ├─ 安全操作：git checkout -b 建分支
│   ├─ 查看：status / diff / log / show
│   ├─ 提交流程：add → commit → push
│   ├─ 回退：restore / reset --soft / reset --hard
│   └─ 关联远程：git remote add → git push -u
│
├─ 二、Bug 修复
│   ├─ Cards.vue Props 不匹配
│   │   ├─ 问题：传 Array 声明 Number → 卡片永远 0
│   │   └─ 修法：改 Props 为 Array，内部 .length
│   │
│   └─ MapContainer.vue 死代码
│       ├─ stopPlayback() 引用 4 个未声明变量
│       └─ 热力图重复初始化 → 删除
│
├─ 三、地图四要素可视化（ConvergeAnalysis.vue）
│   ├─ 🏥 医疗设施
│   │   └─ 青色圆点 CircleMarker r=4  #22d3ee
│   │
│   ├─ 🌳 公园
│   │   ├─ 绿色方块 10x10  #10b981
│   │   ├─ 数据源换为 real_parks.json（193 条真公园）
│   │   └─ 旧数据 91 条中 80 条是体育场馆（篮球公园等）
│   │
│   ├─ 🚇 地铁（重点改造）
│   │   ├─ 散点 → 面状服务区
│   │   │   ├─ 同名站清洗：去括号/去出入口/去号口 → 统一站名
│   │   │   ├─ 凸包 turf.convex + 分级缓冲（300/350/400m）
│   │   │   └─ 蓝色 AMap.Polygon + 站名 Text 标签
│   │   │
│   │   └─ 评分改造
│   │       ├─ 旧：0.8km 内数出口散点（多出口站虚高）
│   │       └─ 新：booleanPointInPolygon 判断是否在服务区面内
│   │           └─ 每站 +15 分，上限 30 分
│   │
│   └─ 🛣️ 道路环境（邻避）
│       ├─ 散点 → 按道路名分组 → 连线缓冲成面（300m）
│       ├─ 单点：红色三角标记
│       └─ 文案：邻避 → 高架/快速路环境影响
│
├─ 四、赣江多分支排除
│   ├─ 结构：主河道 → 分支1 → 分支2 → 分支2.1 → 支线2.2
│   ├─ 缓冲递减：0.65 → 0.50 → 0.50 → 0.40 → 0.35 km
│   ├─ ⚠️ 大坑：turf.union 不重叠返回 null
│   └─ 解法：数组 .some() 逐个判断，不用 union 合并
│
├─ 五、UX 优化
│   ├─ 图例：地图要素说明（4 种 + 评分等级）
│   ├─ 站名标签：AMap.Text 蓝色标签
│   ├─ 评分基础分：保持 65（已排除不可建区域）
│   └─ 执行顺序：renderEnvironmentLayers → startAnalysis
│
├─ 六、踩过的坑
│   ├─ turf.union 不重叠返回 null → 用数组逐判
│   ├─ AMap.Marker div 不显示 → 加 display:inline-block;font-size:0
│   ├─ 同名站清洗不完整 → 统一处理出入口/号口/括号
│   ├─ 漏写变量声明 → facilityMarkers 未定义
│   ├─ 渲染在评分之后 → transitPolygons 为空
│   └─ PowerShell 中文乱码 → 用英文参数
│
└─ 七、架构审查（improve-codebase-architecture）
    ├─ BigScreen.vue 737 行超级组件
    ├─ ConvergeAnalysis.vue 1227 行巨型组件
    ├─ useDashboardCharts.js 写好但未使用
    ├─ 数据字段命名不一致（rName/r_name）
    ├─ AMap Key 硬编码
    └─ CSS 玻璃拟态重复定义
```


---

# 2026-06-11（下）医院服务半径 + 分级查询 + UX 优化

## 一、医疗覆盖率：点判定 → 服务半径面

**文件**：`src/views/ConvergeAnalysis.vue` — `executeAnalysis()` 函数

### 1.1 删旧代码：points 点集合

```js
// ❌ 删除：医院作为散点 FeatureCollection，在格子里数点
// const points = turf.featureCollection(facilityData.map((d) => {
//   return turf.point([d.lng, d.lat], { name: d.name, type: d.type, tier: getHospitalTier(d.type) });
// }));
// const turfPoints = turf.featureCollection(facilityData.map(d => turf.point([d.lng, d.lat])));
```

### 1.2 新代码：hospitalBuffers 服务区面

```js
// ✅ 新增：每个医院生成服务半径缓冲面
// 三甲3km / 综合2km / 专科1km，用于判断网格中心是否被覆盖
const hospitalBuffers = facilityData.map(d => {
  const tier = getHospitalTier(d.type);                         // 1=三甲 2=综合 3=专科
  const radiusKm = tier === 1 ? 3 : tier === 2 ? 2 : 1;       // 等级越高半径越大
  const weight   = tier === 1 ? 3 : tier === 2 ? 2 : 1;       // 权重：三甲×3 综合×2 专科×1
  return {
    buffer: turf.buffer(                                       // Turf.js 点→圆面
      turf.point([d.lng, d.lat]),
      radiusKm,
      { units: 'kilometers' }
    ),
    name: d.name, tier, weight, lng: d.lng, lat: d.lat
  };
});
```

### 1.3 网格覆盖判定替换

```js
// ❌ 删除：格子里数医院点
// const ptsInGrid = turf.pointsWithinPolygon(points, cell);
// const medicalWeight = ptsInGrid.features.reduce((sum, f) => { ... }, 0);
// const medicalCount = ptsInGrid.features.length;

// ✅ 替换：判断格子中心在哪些医院的服务区面内
const covering = hospitalBuffers.filter(h => {
  try {
    return turf.booleanPointInPolygon(currentCenterPt, h.buffer);
  } catch (e) { return false; }
});
const medicalWeight = covering.reduce((s, h) => s + h.weight, 0);  // 加权分（仅用于覆盖率统计）
const medicalCount  = covering.length;                              // 覆盖医院数
cell.properties.count = medicalWeight;
if (medicalWeight >= 1) coveredCells++;  // 覆盖率统计：有任意医院覆盖就算
```

### 1.4 弹窗引用替换

```js
// ❌ 删除
// if (ptsInGrid.features.some(f => ...))          // 拟建检查
// const names = ptsInGrid.features.map(f => ...)   // 医院名列表

// ✅ 替换为 covering
if (covering.some(h => h.name.includes('拟建'))) score += 15;
const names = covering.map(h => `<li>📍 ${h.name}</li>`).join('');
```

### 1.5 效果

三甲 1 家 3km 半径覆盖 ~110 个格子（改前只覆盖所在格子）。

---

## 二、医院 200m 聚类合并

**文件**：`src/views/ConvergeAnalysis.vue` — `renderEnvironmentLayers()` — 设施渲染块

**场景**：同一医院的门诊部+住院部 200m 内 → 合并为一个点显示

### 2.1 距离计算（Haversine 近似）

```js
// 用经纬度差近似计算两点间距离（米），比 turf.distance 快，200m 精度足够
const dist = (a, b) => {
  const dx = (a.lng - b.lng) * 111320 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
  const dy = (a.lat - b.lat) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
};
```

### 2.2 聚类逻辑

```js
// 遍历所有医院，200m 内归入同一 cluster
const clusters = [];
facilityData.forEach(item => {
  let found = false;
  for (const c of clusters) {
    if (dist(item, c.rep) < 200) {        // 距离 < 200 米 → 合并
      c.members.push(item);
      found = true;
      break;
    }
  }
  if (!found) clusters.push({ rep: item, members: [item] });  // 新 cluster
});
```

### 2.3 每个 cluster 取代表

```js
clusters.forEach(cluster => {
  // 取簇内最高等级（数字最小 = 等级最高）
  const bestTier = Math.min(...cluster.members.map(m => getTier(m.type)));

  // 主名取最短（去括号后），副名在悬浮提示里展示
  const names = cluster.members.map(m =>
    m.name.replace(/[\(\（][^)）]*[\)\）]/g, '').trim()
  );
  const mainName = names.reduce((a, b) => a.length <= b.length ? a : b);
  const extraCount = cluster.members.length - 1;

  // 悬浮提示：合并后显示"主名 + N个附属设施"
  const tooltip = extraCount > 0
    ? `${mainName} + ${extraCount}个附属设施\n${cluster.members.map(m => '  ' + m.name).join('\n')}`
    : cluster.members[0].name;

  // ...后续渲染逻辑（大小、颜色、点击事件等）
});
```

---

## 三、医院三级分级渲染

### 3.1 大小和颜色配置

```js
// 根据等级决定渲染参数
const config = bestTier === 1
  ? { radius: 6, fillColor: '#06b6d4', opacity: 1.0, zIndex: 125 }   // 三甲：亮青大圆 白边
  : bestTier === 2
  ? { radius: 4, fillColor: '#0ea5e9', opacity: 0.85, zIndex: 120 }  // 综合：中蓝圆
  : { radius: 2.5, fillColor: '#64748b', opacity: 0.7, zIndex: 115 }; // 专科：灰蓝小圆（不抢眼）
```

### 3.2 渲染并存储等级标签

```js
const dot = new AMap.CircleMarker({
  center: [rep.lng, rep.lat],
  radius: config.radius,
  fillColor: config.fillColor,
  fillOpacity: config.opacity,
  strokeColor: bestTier === 1 ? '#fff' : '#020617',
  strokeWeight: bestTier === 1 ? 2 : 0.5,
  zIndex: config.zIndex,
  title: tooltip          // 悬浮提示：合并后的名称
});
dot._tier = bestTier;     // ⚡ 关键：存储等级，供分级查询按钮使用
dot.setMap(map);
facilityMarkers.push(dot);

// 三甲额外加名称标签（AMap.Text）
if (bestTier === 1) {
  const label = new AMap.Text({
    text: mainName.length > 8 ? mainName.slice(0, 8) + '...' : mainName,
    position: [rep.lng, rep.lat],
    offset: new AMap.Pixel(10, -10),
    style: {
      'font-size': '9px',
      'color': '#cffafe',
      'background-color': 'rgba(0,0,0,0.6)',
      'border-color': '#06b6d4',
      'border-width': '1px',
      'border-style': 'solid',
      'border-radius': '2px',
      'padding': '1px 4px',
    },
    zIndex: 126
  });
  label._tier = bestTier; // ⚡ 标签也存等级，跟 marker 同步显隐
  label.setMap(map);
  facilityMarkers.push(label);
}
```

---

## 四、点击医院查周边公园+地铁

```js
// 绑定点击事件：查看 1km 内公园和地铁站
dot.on('click', () => {
  const nearbyParks = [];
  const nearbyStations = new Set();  // Set 自动去重（多出口 → 同一站名）

  // ① 遍历公园：1km 内按距离排序，取最近 5 个
  if (parkFeatures && parkFeatures.features) {
    parkFeatures.features.forEach(p => {
      const d = turf.distance(
        turf.point([rep.lng, rep.lat]), p,
        { units: 'kilometers' }
      );
      if (d <= 1) nearbyParks.push({ name: p.properties.name, dist: d });
    });
  }

  // ② 遍历地铁口：1km 内，清洗站名去重
  if (transitFeatures && transitFeatures.features) {
    transitFeatures.features.forEach(t => {
      const d = turf.distance(
        turf.point([rep.lng, rep.lat]), t,
        { units: 'kilometers' }
      );
      if (d <= 1) {
        // 清洗："八一广场(地铁站)" / "地铁大厦地铁站地铁·更新天地南口" → "八一广场" / "地铁大厦"
        let sn = (t.properties.name || '')
          .replace(/[\(\（][^)）]*[\)\）]/g, '')
          .replace(/地铁站|出入口|\d+号口|[A-Z]口|[南北东西]口/g, '')
          .replace(/·.+$/, '')
          .trim();
        if (sn) nearbyStations.add(sn);
      }
    });
  }

  // ③ 拼接弹窗 HTML
  const tierName = bestTier === 1 ? '三级甲等' : bestTier === 2 ? '综合医院' : '专科/其他';
  const membersHTML = cluster.members.length > 1
    ? `<div style="font-size:10px;color:#64748b;margin-bottom:4px">
         含：${cluster.members.map(m => m.name).join('、')}
       </div>`
    : '';

  const parkList = nearbyParks.length > 0
    ? nearbyParks
        .sort((a, b) => a.dist - b.dist)           // 最近排前
        .slice(0, 5)                                 // 最多 5 个
        .map(p => `<div>🌳 ${p.name} (${(p.dist*1000).toFixed(0)}m)</div>`)
        .join('')
    : '<div style="color:#64748b">1km内无公园</div>';

  const stationList = nearbyStations.size > 0
    ? [...nearbyStations].slice(0, 5)
        .map(s => `<div>🚇 ${s}</div>`)
        .join('')
    : '<div style="color:#64748b">1km内无地铁站</div>';

  // ④ 弹窗
  infoWindow.setContent(`
    <div class="custom-info-window" style="min-width:280px">
      <div style="font-size:14px;font-weight:bold;color:#06b6d4;margin-bottom:2px">
        🏥 ${mainName}
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">
        ${tierName}${extraCount > 0 ? ` · 共${cluster.members.length}个设施` : ''}
      </div>
      ${membersHTML}
      <div style="border-top:1px solid rgba(59,130,246,0.2);padding-top:6px;font-size:12px;line-height:1.8">
        <div style="color:#10b981;font-weight:bold;margin-bottom:2px">🌳 周边公园</div>${parkList}
        <div style="color:#38bdf8;font-weight:bold;margin-top:6px;margin-bottom:2px">🚇 周边地铁站</div>${stationList}
      </div>
    </div>
  `);
  infoWindow.open(map, [rep.lng, rep.lat]);
});
```

---

## 五、医院分级查询按钮

### 5.1 HTML 模板

```html
<!-- 新增：地图右上角，工具栏下方的分级查询 -->
<div class="hospital-filter-overlay">
  <button class="filter-chip"
    :class="{ 'chip-active': hospitalFilter === 'all' }"
    @click="setHospitalFilter('all')">全部医院</button>

  <button class="filter-chip"
    :class="{ 'chip-active': hospitalFilter === 'tier1' }"
    @click="setHospitalFilter('tier1')">仅三甲</button>

  <button class="filter-chip"
    :class="{ 'chip-active': hospitalFilter === 'tier12' }"
    @click="setHospitalFilter('tier12')">三甲+综合</button>

  <button class="filter-chip"
    :class="{ 'chip-active': hospitalFilter === 'tier3' }"
    @click="setHospitalFilter('tier3')">仅专科</button>
</div>
```

### 5.2 响应式状态

```js
const hospitalFilter = ref('all');  // 'all' | 'tier1' | 'tier12' | 'tier3'
```

### 5.3 过滤逻辑

```js
const setHospitalFilter = (filter) => {
  hospitalFilter.value = filter;
  // 遍历所有设施标记，根据 _tier 属性显示或隐藏
  facilityMarkers.forEach(m => {
    if (m._tier === undefined) return;           // 跳过非医院标记
    if (filter === 'all')   { m.show(); return; }           // 全部
    if (filter === 'tier1') { m._tier === 1 ? m.show() : m.hide(); return; }  // 仅三甲
    if (filter === 'tier12') { m._tier <= 2 ? m.show() : m.hide(); return; }  // 三甲+综合
    if (filter === 'tier3') { m._tier === 3 ? m.show() : m.hide(); return; }  // 仅专科
  });
};
```

### 5.4 CSS

```css
/* 医院分级查询按钮组：固定在工具栏下方 */
.hospital-filter-overlay {
  position: absolute;
  top: 56px; right: 16px;
  z-index: 99;
  display: flex; gap: 6px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(10px);
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.5);
}
.filter-chip {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.filter-chip:hover { color: #cbd5e1; border-color: rgba(255,255,255,0.15); }
/* 选中态：亮青色高亮 */
.filter-chip.chip-active {
  background: rgba(6,182,212,0.15);
  color: #06b6d4;
  border-color: rgba(6,182,212,0.4);
  font-weight: 600;
}
```

---

## 六、评分公式（医院不参与）

```js
// 选址评分 = 65 + 公园 + 地铁 - 道路（医院只展示，不计分）
let score = 65
  + Math.min(30, (pd.count || 0) * 4 * weightPark.value)        // 公园：0.8km内计数
  + Math.min(30, stationCount * 15 * weightTransit.value)        // 地铁：每站+15，上限30
  - ((nd.count || 0) * 15 * weightNimby.value);                  // 道路：每条-15

if (covering.some(h => h.name.includes('拟建'))) score += 15;    // 选址模拟加分
if (nd.minDist < 0.2) score -= 40 * weightNimby.value;           // 紧邻道路重罚
score = Math.max(0, Math.min(100, Math.floor(score)));
```

---

## 七、弹窗内容改造

### 7.1 评估模式：分级汇总

```js
// 统计各等级覆盖数量
const tier1Count = covering.filter(h => h.tier === 1).length;  // 三甲
const tier2Count = covering.filter(h => h.tier === 2).length;  // 综合
const tier3Count = covering.filter(h => h.tier === 3).length;  // 专科

// 拼分级描述（无加权）
let medicalDesc = '<span style="color:#ef4444;">盲区</span>';
if (medicalCount > 0) {
  const parts = [];
  if (tier1Count) parts.push(`<span style="color:#06b6d4;">三甲×${tier1Count}</span>`);
  if (tier2Count) parts.push(`<span style="color:#0ea5e9;">综合×${tier2Count}</span>`);
  if (tier3Count) parts.push(`<span style="color:#94a3b8;">专科×${tier3Count}</span>`);
  medicalDesc = parts.join(' ');  // 仅展示，不参与评分
}

// 公园和地铁显示实际加分
let parkDesc = pd.count > 0
  ? `<span style="color:#10b981;">${pd.count}处 (+${Math.min(30, pd.count * 4 * weightPark.value)}分)</span>`
  : `<span style="color:#94a3b8;">无公园</span>`;
let transitDesc = stationCount > 0
  ? `<span style="color:#38bdf8;">${stationCount}个站 (+${Math.min(30, stationCount * 15 * weightTransit.value)}分)</span>`
  : `<span style="color:#f59e0b;">无地铁覆盖</span>`;
```

### 7.2 普通模式：分级列表（每级最多5家）

```js
const tier1Names = covering.filter(h => h.tier === 1).map(h => h.name);
const tier2Names = covering.filter(h => h.tier === 2).map(h => h.name);
const tier3Count = covering.filter(h => h.tier === 3).length;

let listHTML = '';
// 三甲：列前5，超出显示"...还有X家"
if (tier1Names.length) {
  listHTML += `<div style="color:#06b6d4;font-weight:bold;margin-top:4px;">▸ 三甲 (${tier1Names.length}家)</div>`
    + tier1Names.slice(0, 5).map(n => `<li>📍 ${n}</li>`).join('')
    + (tier1Names.length > 5 ? `<li style="color:#64748b;">...还有${tier1Names.length - 5}家</li>` : '');
}
// 综合：同上
if (tier2Names.length) {
  listHTML += `<div style="color:#0ea5e9;font-weight:bold;margin-top:4px;">▸ 综合 (${tier2Names.length}家)</div>`
    + tier2Names.slice(0, 5).map(n => `<li>📍 ${n}</li>`).join('')
    + (tier2Names.length > 5 ? `<li style="color:#64748b;">...还有${tier2Names.length - 5}家</li>` : '');
}
// 专科：只报数不列名
if (tier3Count) {
  listHTML += `<div style="color:#94a3b8;font-weight:bold;margin-top:4px;">▸ 专科/其他 (${tier3Count}家)</div>`;
}

// 汇总
`覆盖 ${medicalCount} 处设施（仅供参考，不参与评分）`
```

---

## 八、弹窗交互优化

### 8.1 可滚动

```css
/* 根因：高德 InfoWindow 默认阻止鼠标事件 → 滚动条鼠标碰不到 */
/* 修复：启用 pointer-events + 限制高度 */

:deep(.amap-info-content) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
  pointer-events: auto !important;   /* ← 关键：启用鼠标交互 */
  overflow: visible !important;
}

:deep(.custom-info-window) {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(6px);
  border: 1px solid #3b82f6 !important;
  border-radius: 6px;
  padding: 12px;
  min-width: 210px;
  max-height: 320px;                 /* ← 限制高度 */
  overflow-y: auto;                  /* ← 超出滚动 */
  color: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}
/* 滚动条美化 */
:deep(.custom-info-window)::-webkit-scrollbar { width: 4px; }
:deep(.custom-info-window)::-webkit-scrollbar-thumb {
  background-color: #475569; border-radius: 2px;
}
```

### 8.2 关闭逻辑：从定时关闭改为点击关闭

```js
// ❌ 改前：离开格子 300ms 后自动关 → 鼠标移到弹窗就消失
polygon.on('mouseout', () => {
  infoTimer = setTimeout(() => infoWindow.close(), 300);
});

// ✅ 改后：离开格子只恢复样式，不关弹窗
// 弹窗通过 infoWindow 自身的 closeWhenClickMap: true 关闭（点击地图任意处）
polygon.on('mouseout', () => {
  polygon.setOptions({
    fillOpacity: showEvaluationMode.value ? 0.15 : baseFillOpacity,
    strokeWeight: strokeWeight,
    strokeColor: strokeColor
  });
});
```

---

## 九、工具栏：公园/地铁独立开关

### 9.1 HTML

```html
<!-- 改前：一个按钮控制所有设施 -->
<!-- <button @click="toggleLayer('facilities')">🏥 设施</button> -->

<!-- 改后：公园和地铁各自独立 -->
<button class="toolbar-tile"
  :class="{ 'active-tile': layerVisibility.parks }"
  @click="toggleLayer('parks')">
  <span class="tile-icon">🌳</span><span class="tile-text">公园</span>
</button>
<button class="toolbar-tile"
  :class="{ 'active-tile': layerVisibility.transits }"
  @click="toggleLayer('transits')">
  <span class="tile-icon">🚇</span><span class="tile-text">地铁</span>
</button>
```

### 9.2 缩放联动修复

```js
// 改前：统一判断 layerVisibility.value.facilities
// const shouldShowNimby = zoom >= 13.5 && layerVisibility.value.facilities;
// const shouldShowBasic = zoom >= 12.5 && layerVisibility.value.facilities;

// 改后：各自独立判断
const shouldShowNimby = zoom >= 13.5 && layerVisibility.value.nimbys;
nimbyMarkers.forEach(m => shouldShowNimby ? m.show() : m.hide());
const shouldShowBasic = zoom >= 12.5;
if (layerVisibility.value.parks)    parkMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
if (layerVisibility.value.transits) transitMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
```

---

## 十、图例提示

```html
<!-- 图例中加操作提示 -->
<div class="legend-hint">💡 点击地图上的图标可查看详情</div>
```

---

## 十一、本次全部改动文件

| 文件 | 改动 |
|---|---|
| `src/views/ConvergeAnalysis.vue` | 服务半径覆盖 + 200m聚类 + 三级渲染 + 分级按钮 + 弹窗优化 + 工具栏分离 + 点击互动 |
| `src/data/facilities.json` | 换用 196 条真医院数据（33三甲+44综合+119专科） |
