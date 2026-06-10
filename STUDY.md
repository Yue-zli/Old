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
