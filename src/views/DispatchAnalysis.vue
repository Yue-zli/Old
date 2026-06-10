<template>
  <div class="analysis-page">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="brand-title">全城需求热力监控</h2>
        <div class="live-status">
          <span class="dot"></span> 系统运行中
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">当前全城需求总量</div>
          <div class="kpi-value">{{ orders.length }} <small>件</small></div>
        </div>
        <div class="kpi-card danger">
          <div class="kpi-label">高压力预警区域</div>
          <div class="kpi-value">{{ warningCount }} <small>处</small></div>
        </div>
      </div>

      <div class="rank-section">
        <h3 class="section-title">区域负载实时排行</h3>
        <div class="rank-list">
          <div v-for="(r, i) in hotRegions" :key="i" class="rank-item" @click="focusRegion(r.pos)">
            <div class="rank-info">
              <span class="rank-idx">{{ i + 1 }}</span>
              <span class="region-name">{{ r.name }}</span>
              <span class="region-data">{{ r.count }}单</span>
            </div>
            <div class="progress-bg">
              <div class="progress-fill" :style="{ width: r.percent + '%', background: r.color }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="interactive-panel">
        <div class="panel-row">
          <span>监测精度</span>
          <input type="range" min="30" max="150" v-model.number="heatRadius" @change="updateHeatmap" />
        </div>
        <p class="desc">调整滑块可分析更深层次的社区级需求聚集点</p>
      </div>

      <button class="exit-btn" @click="$router.push('/dashboard')">返回指挥中心</button>
    </aside>

    <main class="map-area">
      <div id="dispatch-map" class="map-view"></div>
      
      <div class="map-legend">
        <div class="legend-header">需求热度等级</div>
        <div class="color-bar"></div>
        <div class="color-labels">
          <span>低 (正常)</span>
          <span>中 (繁忙)</span>
          <span>高 (饱和)</span>
        </div>
        <div class="legend-tip">红色区域代表服务资源缺口较大，需紧急调度。</div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import * as api from '../api/stat.js';

// 安全配置
window._AMapSecurityConfig = { securityJsCode: '158271bb9de2653a0ff710b76a77a458' };

const orders = ref([]);
const heatRadius = ref(80);
const heatmapInstance = ref(null);
let map = null;

const warningCount = computed(() => hotRegions.value.filter(r => r.percent > 70).length);

// 演示用模拟排行数据
const hotRegions = ref([
  { name: '红谷滩片区', count: 45, percent: 92, color: '#ff4d4f', pos: [115.85, 28.68] },
  { name: '东湖区老街', count: 32, percent: 68, color: '#faad14', pos: [115.89, 28.67] },
  { name: '西湖区街道', count: 18, percent: 45, color: '#1890ff', pos: [115.91, 28.66] }
]);

async function initMap() {
  const AMap = await AMapLoader.load({
    key: '3b1255de527dd6a6af98dd5bdd4970dd',
    version: '2.0',
    plugins: ['AMap.HeatMap']
  });

  map = new AMap.Map('dispatch-map', {
    zoom: 12,
    center: [115.892, 28.676],
    mapStyle: 'amap://styles/whitesmoke' // 浅色底图让热力更亮眼
  });

  const res = await api.listServiceOrders(); //
  orders.value = res || [];

  heatmapInstance.value = new AMap.HeatMap(map, {
    radius: heatRadius.value,
    opacity: [0, 0.9],
    gradient: {
      0.4: '#1890ff',
      0.6: '#52c41a',
      0.8: '#fadb14',
      1.0: '#ff4d4f'
    }
  });

  updateHeatmap();
}

function updateHeatmap() {
  if (!heatmapInstance.value) return;
  const data = orders.value.map(o => ({
    lng: parseFloat(o.rLng),
    lat: parseFloat(o.rLat),
    count: 1
  }));
  heatmapInstance.value.setDataSet({ data, max: 5 });
  heatmapInstance.value.setOptions({ radius: heatRadius.value });
}

function focusRegion(pos) {
  map?.setZoomAndCenter(14, pos);
}

onMounted(initMap);
onBeforeUnmount(() => map?.destroy());
</script>

<style scoped>
/* 页面整体布局 */
.analysis-page {
  display: flex;
  height: 100vh;
  background: #f4f7f9;
}

/* 侧边栏：决策看板风格 */
.sidebar {
  width: 400px;
  background: #fff;
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 10px 0 30px rgba(0,0,0,0.05);
  z-index: 100;
}

.brand-title {
  font-size: 24px;
  font-weight: 900;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.5px;
}

.live-status {
  font-size: 13px;
  color: #52c41a;
  font-weight: bold;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
  animation: blink 1.5s infinite;
}

/* KPI卡片 */
.kpi-grid {
  display: flex;
  gap: 16px;
  margin-top: 30px;
}

.kpi-card {
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  background: #f8faff;
  border: 1px solid #eef2f6;
}

.kpi-card.danger {
  background: #fff1f0;
  border-color: #ffccc7;
}

.kpi-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a1a;
}

.kpi-value small {
  font-size: 14px;
  color: #999;
}

.danger .kpi-value {
  color: #ff4d4f;
}

/* 排行榜样式 */
.rank-section {
  margin-top: 40px;
  flex: 1;
}

.section-title {
  font-size: 14px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.rank-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 10px;
}

.rank-item:hover {
  background: #f5f7fa;
}

.rank-info {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.rank-idx {
  width: 20px;
  font-weight: bold;
  color: #ccc;
}

.region-name {
  flex: 1;
  font-weight: bold;
  font-size: 15px;
  color: #333;
}

.region-data {
  font-size: 13px;
  color: #666;
}

.progress-bg {
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.8s;
}

/* 交互控制 */
.interactive-panel {
  background: #f0f2f5;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.panel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 10px;
}

.desc {
  font-size: 11px;
  color: #999;
  margin: 0;
}

.exit-btn {
  width: 100%;
  padding: 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
}

/* 地图与图例 */
.map-area {
  flex: 1;
  position: relative;
}

.map-view {
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  width: 260px;
}

.legend-header {
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 12px;
}

.color-bar {
  height: 8px;
  background: linear-gradient(to right, #1890ff, #52c41a, #fadb14, #ff4d4f);
  border-radius: 4px;
}

.color-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  margin: 8px 0 15px 0;
}

.legend-tip {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

/* 闪烁动画 */
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
</style>