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
