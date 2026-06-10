<template>
  <div class="route-page">
    <!-- 控制面板区域 -->
    <div class="control-panel">
      <div class="panel-header">
        <h2>适老化出行助手</h2>
        <button class="exit-btn" @click="$router.push('/dashboard')">退出</button>
      </div>

      <!-- 起点终点输入组 -->
      <div class="input-group">
        <div class="location-row">
          <span class="icon start">起</span>
          <input 
            type="text" 
            v-model="startLoc" 
            placeholder="输入起点 (如: 八一广场)" 
          />
        </div>
        <div class="location-row">
          <span class="icon end">终</span>
          <input 
            type="text" 
            v-model="endLoc" 
            placeholder="输入终点 (如: 滕王阁)" 
          />
        </div>
      </div>

      <!-- 偏好设置 -->
      <div class="preference-box">
        <label class="check-box">
          <input type="checkbox" v-model="avoidStairs" />
          <span class="check-label">避开天桥/地下道</span>
        </label>
        <label class="check-box">
          <input type="checkbox" checked />
          <span class="check-label">优先大路/电梯</span>
        </label>
      </div>

      <!-- 规划按钮 -->
      <button 
        class="big-btn start-btn" 
        @click="planRoute" 
        :disabled="isPlanning"
      >
        {{ isPlanning ? '正在规划中...' : '开始规划路线' }}
      </button>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-box">
        {{ errorMsg }}
      </div>

      <!-- 路线结果展示 -->
      <div v-if="routeSteps.length > 0" class="steps-container">
        <div class="summary">
          <div class="summary-item">
            <span class="label">预计时间</span>
            <span class="val">{{ duration }} <small>分钟</small></span>
          </div>
          <div class="summary-item">
            <span class="label">步行距离</span>
            <span class="val">{{ distance }} <small>米</small></span>
          </div>
        </div>
        <div class="step-list">
          <div 
            v-for="(step, index) in routeSteps" 
            :key="index" 
            class="step-item"
          >
            <span class="step-num">{{ index + 1 }}</span>
            <span class="step-text">{{ step.instruction }}</span>
          </div>
          <div class="step-item end">
            <span class="step-num">终</span>
            <span class="step-text">到达目的地：{{ endLoc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图容器 -->
    <div id="route-map" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';

// === 高德地图配置区 ===
// 注意：AMAP_KEY 需要与您的安全密钥是同一账号下申请的
const AMAP_KEY = '3b1255de527dd6a6af98dd5bdd4970dd'; 

// 已填入安全密钥
const AMAP_SECURITY_CODE = '158271bb9de2653a0ff710b76a77a458';

// 注入安全密钥配置
window._AMapSecurityConfig = {
  securityJsCode: AMAP_SECURITY_CODE,
};

// === 响应式数据 ===
const startLoc = ref('八一广场');         // 起点位置
const endLoc = ref('滕王阁');             // 终点位置
const avoidStairs = ref(true);             // 是否避开楼梯
const routeSteps = ref([]);                // 路线步骤数组
const duration = ref(0);                   // 预计耗时(分钟)
const distance = ref(0);                   // 步行距离(米)
const isPlanning = ref(false);             // 是否正在规划路线
const errorMsg = ref('');                  // 错误提示信息

// === 全局变量 ===
let map = null;         // 地图实例
let walking = null;     // 步行导航实例
let AMapObj = null;     // 高德地图主对象

/**
 * 初始化高德地图
 * 加载地图实例、插件，并添加适老化设施标记
 */
async function initMap() {
  try {
    // 加载高德地图 SDK
    AMapObj = await AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Walking', 'AMap.Geocoder', 'AMap.PlaceSearch']
    });

    // 创建地图实例
    map = new AMapObj.Map('route-map', {
      zoom: 14,
      center: [115.892151, 28.676493], // 南昌中心坐标
      mapStyle: 'amap://styles/whitesmoke' // 浅色底图样式
    });

    // 模拟适老化设施：爱心驿站标记点
    const stations = [
      { pos: [115.898, 28.678], name: '爱心驿站' },
      { pos: [115.895, 28.675], name: '社区休息点' },
      { pos: [115.890, 28.679], name: '老年服务中心' }
    ];

    // 遍历添加标记点
    stations.forEach(st => {
      new AMapObj.Marker({
        map: map,
        position: st.pos,
        content: `<div style="background:#52c41a;color:#fff;padding:6px 10px;border-radius:20px;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-weight:bold;">${st.name}</div>`,
        offset: new AMapObj.Pixel(-40, -40)
      });
    });

  } catch (e) {
    console.error('地图加载失败', e);
    errorMsg.value = '地图加载失败，请检查网络或Key配置';
  }
}

/**
 * 规划步行路线
 * 验证输入 -> 调用高德步行接口 -> 处理返回结果
 */
function planRoute() {
  // 输入验证
  if (!startLoc.value || !endLoc.value) {
    errorMsg.value = "请填写起点和终点";
    return;
  }

  // 重置状态
  errorMsg.value = '';
  isPlanning.value = true;
  routeSteps.value = [];

  // 清除之前的路线
  if (walking) walking.clear();

  // 创建步行导航实例
  walking = new AMapObj.Walking({
    map: map,
    panel: "",
    hideMarkers: false,
    isOutline: true,
    outlineColor: '#ffeeee',
    autoFitView: true
  });

  // 搜索步行路线
  walking.search(
    [
      { keyword: startLoc.value, city: '南昌' },
      { keyword: endLoc.value, city: '南昌' }
    ],
    (status, result) => {
      // 结束加载状态
      isPlanning.value = false;
      
      // 处理成功结果
      if (status === 'complete') {
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          distance.value = route.distance;
          duration.value = Math.ceil(route.time / 60);
          routeSteps.value = route.steps;
          map.setFitView(); // 自适应视野
        } else {
          errorMsg.value = '未找到合适路线，请尝试更换地点';
        }
      } 
      // 处理失败结果
      else {
        console.error('规划失败', result);
        if (result === 'INVALID_USER_SCODE') {
          errorMsg.value = '安全密钥配置错误，请检查 Key 与密钥是否匹配';
        } else {
          errorMsg.value = '未找到相关地点，请尝试输入更详细的地址';
        }
      }
    }
  );
}

// === 生命周期钩子 ===
// 挂载时初始化地图
onMounted(() => {
  initMap();
});

// 卸载前销毁地图实例
onBeforeUnmount(() => {
  if (map) map.destroy();
});
</script>

<style scoped>
/* 页面整体样式 */
.route-page {
  display: flex;
  height: 100vh;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #f0f2f5;
}

/* 左侧控制面板 */
.control-panel {
  width: 420px;
  background: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 20px rgba(0,0,0,0.08);
  z-index: 10;
  overflow-y: auto;
}

/* 面板头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
}

h2 { 
  font-size: 26px; 
  color: #333; 
  margin: 0; 
  font-weight: 800; 
}

.exit-btn {
  padding: 8px 18px;
  font-size: 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
}

.exit-btn:hover { 
  background: #e6e6e6; 
}

/* 输入框组 */
.input-group { 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
  margin-bottom: 24px; 
}

.location-row {
  display: flex;
  align-items: center;
  background: #f7f9fc;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid #eef2f6;
  transition: border-color 0.3s;
}

.location-row:focus-within { 
  border-color: #1f6feb; 
}

/* 起点终点图标 */
.icon {
  width: 40px; 
  height: 40px; 
  line-height: 40px;
  text-align: center; 
  border-radius: 50%;
  color: #fff; 
  font-weight: bold; 
  font-size: 20px;
  margin-right: 14px; 
  flex-shrink: 0;
}

.icon.start { 
  background: #52c41a; 
}

.icon.end { 
  background: #ff4d4f; 
}

/* 输入框样式 */
input {
  border: none; 
  background: transparent;
  font-size: 22px; 
  color: #333; 
  width: 100%; 
  outline: none; 
  font-weight: 500;
}

/* 偏好设置区域 */
.preference-box { 
  display: flex; 
  gap: 20px; 
  margin-bottom: 25px; 
}

.check-box { 
  display: flex; 
  align-items: center; 
  cursor: pointer; 
}

.check-box input { 
  width: 24px; 
  height: 24px; 
  margin-right: 10px; 
  accent-color: #1f6feb; 
}

.check-label { 
  font-size: 18px; 
  color: #555; 
}

/* 主按钮样式 */
.big-btn {
  width: 100%; 
  padding: 16px;
  background: #1f6feb; 
  color: #fff;
  font-size: 24px; 
  font-weight: bold;
  border: none; 
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 6px 15px rgba(31, 111, 235, 0.25);
  margin-bottom: 20px; 
  transition: all 0.2s;
}

.big-btn:hover { 
  background: #165bca; 
  transform: translateY(-2px); 
}

.big-btn:disabled { 
  background: #ccc; 
  cursor: not-allowed; 
  transform: none; 
  box-shadow: none; 
}

/* 错误提示框 */
.error-box {
  background: #fff2f0; 
  border: 1px solid #ffccc7; 
  color: #ff4d4f;
  padding: 10px; 
  border-radius: 8px; 
  margin-bottom: 20px; 
  font-size: 16px;
}

/* 路线结果容器 */
.steps-container {
  background: #fff; 
  border-radius: 16px;
  border: 2px solid #eef2f6; 
  overflow: hidden;
  flex: 1; 
  display: flex; 
  flex-direction: column;
}

/* 路线汇总信息 */
.summary {
  background: #eef6ff; 
  padding: 20px;
  display: flex; 
  justify-content: space-around;
  border-bottom: 1px solid #e0eaf5;
}

.summary-item { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
}

.summary-item .label { 
  font-size: 14px; 
  color: #666; 
  margin-bottom: 4px; 
}

.summary-item .val { 
  font-size: 28px; 
  font-weight: bold; 
  color: #1f6feb; 
}

.summary-item .val small { 
  font-size: 14px; 
  font-weight: normal; 
  color: #666; 
}

/* 路线步骤列表 */
.step-list { 
  padding: 15px; 
  overflow-y: auto; 
  max-height: 400px; 
}

.step-item {
  display: flex; 
  align-items: flex-start; 
  padding: 15px 0;
  border-bottom: 1px solid #f5f5f5; 
  font-size: 18px; 
  color: #333;
}

.step-item:last-child { 
  border-bottom: none; 
}

.step-item.end { 
  color: #ff4d4f; 
  font-weight: bold; 
}

/* 步骤序号 */
.step-num {
  background: #e0e0e0; 
  color: #666;
  width: 28px; 
  height: 28px; 
  line-height: 28px;
  text-align: center; 
  border-radius: 50%; 
  font-size: 14px;
  margin-right: 15px; 
  margin-top: 2px; 
  flex-shrink: 0; 
  font-weight: bold;
}

.step-item:nth-child(1) .step-num { 
  background: #52c41a; 
  color: #fff; 
}

.step-item.end .step-num { 
  background: #ff4d4f; 
  color: #fff; 
}

/* 地图容器 */
.map-container { 
  flex: 1; 
  height: 100%; 
}
</style>