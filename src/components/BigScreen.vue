<template>
  <div class="dashboard">
    <!--回放控制面板-->


    <TheHeader
      :current-Mode="currentMode"
      @switch-mode="handleModeSwitch"
    />

    <!-- KPI 概览栏：总量统计 + 快捷操作 -->
    <div class="kpi-overview">
      <div class="kpi-item">
        <div class="kpi-value">{{ totalStats.total }}</div>
        <div class="kpi-label">{{ totalStats.label }}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value">{{ managers.length }}</div>
        <div class="kpi-label">在岗管理</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value">{{ volunteers.length }}</div>
        <div class="kpi-label">注册志愿</div>
      </div>
      <div class="kpi-actions">
        <button class="action-btn heatmap-btn" :class="{ active: heatmap }" @click="toggleHeatmap" title="切换热力图">
          🔥 {{ heatmap ? '热力开' : '热力关' }}
        </button>
        <button class="action-btn nav-btn" @click="goAnalysis" title="跳转设施覆盖评价">
          📊 设施覆盖
        </button>
        <button class="action-btn nav-btn" @click="goList" title="跳转需求者列表">
          📋 需求列表
        </button>
      </div>
    </div>

    <main class="main">
      <!--左侧地图-->
      <section class="left-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="icon">{{ modeIcon }}</span> {{ modeTitle }}
          </div>
          <div class="date-display">{{ selectedDateStr }} 调度监控中</div>
        </div>
        <div class="map-container-box" style="position: relative">
          <MapContainer
            :services="displayOrders"
            :heatmap="heatmap"
            :currentMode="currentMode"
            @marker-click="openDetail"
          />
          <PlaybackPanel
            :isPlaying="isPlaying"
            :playProgress="playProgress"
            :currentTimeDisplay="currentTimeDisplay"
            :timeAxisTicks="timeAxisTicks"
            :currentScale="playbackScale"
            :scaleMap="scaleMap"
            @play="startMapPlayback"
            @change-scale="(val) => {
              stopPlayback()
              playbackScale = val;
              initDisplayOrders()
            }"
            @seek="seekToPercent"
          />
        </div>
      </section>
      <!--右侧统计-->
      <aside class="right-panel">
        <Cards 
          :orders="orders"
          :managers="managers"
          :volunteers="volunteers"
        />
        <!--图表区-->
        <div class="charts-section">
          <div class="charts-upper">
            <AgeChart 
              :data="ageData" 
              title="年龄分布统计"/>
            <GenderChart 
              :data="genderData" 
              title="性别比例"/>
          </div>
          
          <div class="chart-container full-width trend-analysis-box">
            <TrendChart 
              ref="trendChart"
              v-model:currentScale="currentScale"
              v-model:selectedDate="selectedDate"
            />
            <div v-if="peakInfo.value" class="peak-tag">
              高峰时段：<span class="highlight">{{ peakInfo.time }}</span> ({{ peakInfo.value }}单)
            </div>
                         
          </div>

          <div class="lower-group">
            <TypeChart :data="typeData" title="服务类型占比" />
          </div>
        </div>
      </aside>
    </main>

    <transition name="slide">
      <div v-if="detailVisible" class="detail-overlay" @click.self="detailVisible = false">
        <div class="detail-side">
          <button class="close-btn" @click="detailVisible = false">×</button>
          <div class="detail-content">
            <h2 class="detail-header">{{ detailItem.rName }}</h2>
            <div class="detail-row">
              <label>联系电话</label>
              <span><a :href="`tel:${detailItem.rPhone}`">{{ detailItem.rPhone }}</a></span>
            </div>
            <div class="detail-row">
              <label>服务类型</label>
              <span class="highlight">{{ svcMap[detailItem.serviceType] || '其他服务' }}</span>
            </div>
            <div class="detail-row">
              <label>任务状态</label>
              <span :class="detailItem.status === '已完成' ? 'status-done' : 'status-doing'">
                {{ detailItem.status }}
              </span>
            </div>
            <div class="detail-row">
              <label>发布时间</label>
              <span class="time-text">{{ formatTime(detailItem.publishTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';

import * as api from '../api/stat.js';
import { mockManagers, mockVolunteers } from '../data/mockUsers.js';


//组件
import TheHeader from '../components/TheHeader.vue';
import MapContainer from './MapContainer.vue';
import PlaybackPanel from './PlaybackPanel.vue';
import Cards from './Cards.vue';
import AgeChart from './Charts/AgeChart.vue';
import GenderChart from './Charts/GenderChart.vue';
import TypeChart from './Charts/TypeChart.vue';
import TrendChart from './Charts/TrendChart.vue';

//播放逻辑
import { usePlayback } from '../views/usePlayback.js';

const router = useRouter();

const currentMode = ref('demand');
const modeTitle = computed(()=> {
  if(currentMode.value === 'demand') return '实时服务轨迹与热力分布';
  if(currentMode.value === 'evaluation') return '15分钟生活圈评价分析';
  return '适老化路径规划';
});

const modeIcon = computed(() => {
  if (currentMode.value === 'demand') return '🔥';
  if (currentMode.value === 'evaluation') return '🌐';
  return '🚀';
});

const handleModeSwitch = (mode) => {
  currentMode.value = mode;
  
  if (mode === 'evaluation') {
    // 切换到评价模式时，停止地图回放
    stopPlayback();
    // 可以在这里触发右侧图表的变化，展示“资源分布统计”
  } else if (mode === 'demand') {
    // 切回需求模式，初始化数据
    initDisplayOrders();
  }
};

//数据
const orders = ref([]);
const managers = ref([...mockManagers]);
const volunteers = ref([...mockVolunteers]);
const heatmap = ref(false);
//详细弹窗
const detailItem = ref({});
const detailVisible = ref(false);

// 服务类型
const svcMap = { 0: '基础照护', 1: '陪护服务', 2: '送餐服务', 3: '清洁服务', 4: '心理疏导' };

//静态图表数据
const ageChart = ref(null);   //年龄
const genderChart = ref(null);  //性别
const typeChart = ref(null);  //事件类型

//趋势图数据
const trendChart = ref(null); //时间
const peakInfo = ref({ time:'', value:0 });

const ageData = ref([]);
const genderData = ref([]);
const typeData = ref([]);
const trendData = ref([]);


//日期选择
/**日订单统计表切换日期 */
const selectedDate = ref(new Date('2025-01-21 00:00:00')); //当前选中的日期


/*交叉统计*/
const totalStats = computed(() => {
  const total = orders.value.length;
  return {
    total,
    label: `订单总量`
  };
});

//地图播放

const currentScale = ref('day'); //默认一天的总订单量
const playbackScale = ref('day')
const scaleMap = { day: '日', week: '周', month: '月' };
const changeScale = (val) => {
  currentScale.value=val;
}

const{
  displayOrders, 
  isPlaying, 
  playProgress,
  currentTimeDisplay,
  timeAxisTicks, 
  startMapPlayback, 
  stopPlayback, 
  initDisplayOrders,
  seekToPercent
} = usePlayback(orders, heatmap, playbackScale, selectedDate);



//计算格式化后的日期显示
const selectedDateStr=computed(() => {
  const d = selectedDate.value;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${
  String(d.getDate()).padStart(2,'0')}`;
});



//Resize
const handleResize = () =>{
  ageChart.value?.resize?.();
  genderChart.value?.resize?.();
  typeChart.value?.resize?.();
  trendChart.value?.resize?.();
}

//打开详情
function openDetail(item) {
  detailItem.value = item;
  detailVisible.value = true;
}




//日期偏移




async function fetchAll() {
  try {
    //数据清洗
    const list = await api.listServiceOrders();  //异步请求后端接口
    orders.value = (list || []).map(item => ({
      ...item,
      rName: item.rName || item.r_name || '未知人员',
      rPhone: item.rPhone || item.r_phone || '无',
      rLat: parseFloat(item.rLat || item.r_lat || item.rlat || 0),
      rLng: parseFloat(item.rLng || item.r_lng || item.rlng || 0),
      serviceType: (item.serviceType !== undefined ? item.serviceType : item.service_type) ?? 0,
      status: item.status || '进行中',
      publishTime: item.publishTime || item.publish_time || item.publishtime
    }));
    initDisplayOrders();

    // 静态图表各自独立请求，一个挂不影响其他（带日志便于排查）
    try { ageData.value = await api.statElderlyAge(60,70,80); console.log('年龄数据:', ageData.value); } catch (e) { console.error('年龄统计失败:', e); }
    try { genderData.value = await api.statElderlyGender(); console.log('性别数据:', genderData.value); } catch (e) { console.error('性别统计失败:', e); }
    try { typeData.value = await api.statServiceType(); console.log('服务类型数据:', typeData.value); } catch (e) { console.error('服务类型统计失败:', e); }

  } catch (e) {
    console.error('订单数据加载失败:', e);
  }
}

//格式化时间
function formatTime(t) {
  if (!t) return '无';
  return new Date(t).toLocaleString();
}

//热力图
function toggleHeatmap() { 
  heatmap.value = !heatmap.value; 
}

function goAnalysis() { 
  router.push('/analysis'); 
}

function goList() { 
  router.push('/requesters'); 
}



onMounted(() => {
  fetchAll();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize',handleResize);
})

</script>

<style scoped>
/* ===== 全局布局 ===== */
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #060a1a;
  overflow: hidden;
}

/* ===== KPI 概览栏（紧凑） ===== */
.kpi-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background: rgba(16, 24, 48, 0.9);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(10px);
  gap: 24px;
}
.kpi-item { text-align: center; flex-shrink: 0; }
.kpi-value { font-size: 22px; font-weight: 800; color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
.kpi-label { font-size: 10px; color: #64748b; margin-top: 1px; letter-spacing: 1px; }

.kpi-actions { display: flex; gap: 6px; margin-left: auto; }
.action-btn.heatmap-btn,
.action-btn.nav-btn {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #94a3b8;
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
}
.action-btn.heatmap-btn:hover,
.action-btn.nav-btn:hover { background: rgba(59, 130, 246, 0.15); border-color: #3b82f6; color: #e2e8f0; }
.action-btn.heatmap-btn.active { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; color: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }

/* ===== 主内容区：地图 60% + 图表 40% ===== */
.main {
  display: flex;
  flex: 1;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

/* 左侧地图面板 */
.left-panel {
  flex: 3;
  display: flex;
  flex-direction: column;
  background: #0d1425;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: bold;
  color: #60a5fa;
  background: rgba(13, 20, 37, 0.6);
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  text-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
}
.map-container-box {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 右侧图表面板 */
.right-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* ===== 图表区：三段比例 ===== */
.charts-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

/* 上段：年龄 + 性别 (22%) — 紧凑 */
.charts-upper {
  display: flex;
  gap: 8px;
  flex: 2.2;
  min-height: 0;
}
.charts-upper > * { flex: 1; min-width: 0; min-height: 0; }

/* 中段：趋势图 (56%) — 主力图表给最多空间 */
.trend-analysis-box {
  flex: 5.6;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 下段：服务类型占比 (22%) — 紧凑 */
.lower-group {
  flex: 2.2;
  min-height: 0;
  overflow: hidden;
}

.full-width { width: 100%; height: 100%; }

/* ===== 详情弹窗（暗色主题） ===== */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
}
.detail-side {
  position: absolute;
  right: 20px;
  top: 70px;
  width: 300px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}
.detail-header {
  font-size: 16px;
  color: #e2e8f0;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  padding-bottom: 8px;
}
.detail-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  font-size: 13px;
  color: #cbd5e1;
}
.detail-row label { color: #64748b; font-size: 10px; letter-spacing: 1px; }
.status-done { color: #10b981; font-weight: bold; }
.status-doing { color: #f59e0b; font-weight: bold; }

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 5px;
}

.main-title{ 
  font-weight: bold;
  color: #1e3a8a;
}

.total-badge {
  font-size: 12px;
  background: #eff6ff;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 10px;
}

.time-tabs button {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
}

.time-tabs button.active {
  background: #1e3a8a;
  color:#fff;
  border-color: #1e3a8a
}

.peak-tag {
  font-size: 12px;
  text-align: center;
  color: #64748b;
  margin-top: 5px;
}

.highlight {
  color: #ef4444;
  font-weight: bold; 
}

/* 添加到 BigScreen.vue 的 style 标签中 */
.map-play-ctrl {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
}

.map-play-ctrl button {
  background: rgba(30, 58, 138, 0.9); /* 深蓝色背景 */
  color: #fff;
  border: 1px solid #3b82f6;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
}

.map-play-ctrl button:hover {
  background: #2563eb;
  transform: scale(1.05);
}

.map-play-ctrl button:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.date-picker-mini {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: 15px;
  background: #f8fafc;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.current-date-text {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a8a;
  min-width: 85px;
  text-align: center;
}

.nav-arrow {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0 5px;
  font-size: 12px;
  transition: transform 0.2s;
}

.nav-arrow:hover {
  transform: scale(1.2);
  color: #1d4ed8;
}

.nav-arrow:active {
  transform: scale(0.9);
}



.current-time-text {
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 14px;
}





.progress-bar {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.axis-ticks {
  position: absolute;
  top: 12px;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.tick-item {
  color: #64748b;
  font-size: 10px;
}

/* 简单的加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ===== 图表通用容器：暗色科技风 ===== */
:deep(.chart-container) {
  width: 100%; height: 100%;
  background: rgba(16, 24, 48, 0.5) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(59, 130, 246, 0.2) !important;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
:deep(.chart-container:hover) {
  border-color: rgba(59, 130, 246, 0.4) !important;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>