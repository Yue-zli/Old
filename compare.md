<template>
  <div class="dashboard dark-theme">
    <TheHeader 
      :heatmap="heatmap"
      @toggle-heatmap="toggleHeatmap" 
      @go-analysis="goAnalysis" 
      @go-list="goList"
    />

    <div class="kpi-overview">
      <div class="kpi-item" v-for="(val, label) in kpiData" :key="label">
        <div class="kpi-value">{{ val }}</div>
        <div class="kpi-label">{{ label }}</div>
      </div>
    </div>

    <main class="main">
      <section class="left-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="icon">📍</span> 实时服务轨迹与热力分布
          </div>
          <div class="date-display">{{ selectedDateStr }} 调度监控中</div>
        </div>
        
        <div class="map-container-box">
          <MapContainer 
            :services="displayOrders" 
            :heatmap="heatmap" 
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
              stopPlayback();
              playbackScale = val;
              initDisplayOrders();
            }"
            @seek="seekToPercent"
          />
        </div>
      </section>

      <aside class="right-panel">
        <div class="side-module">
          <div class="module-header">服务资源概况</div>
          <Cards 
            :orders-count="orders.length"
            :managers-count="managers.length"
            :volunteers-count="volunteers.length"
          />
        </div>

        <div class="side-module flex-grow">
          <div class="module-header">
            需求时序趋势
            <div class="sub-tool">维度: {{ scaleMap[currentScale] }}</div>
          </div>
          <div class="chart-box">
            <TrendChart 
              ref="trendChart"
              v-model:currentScale="currentScale"
              v-model:selectedDate="selectedDate"
            />
            <div v-if="peakInfo.value" class="peak-indicator">
              🔥 高峰预警: {{ peakInfo.time }} ({{ peakInfo.value }}单)
            </div>
          </div>
        </div>

        <div class="side-module bottom-group">
          <div class="sub-charts">
            <div class="sub-item">
              <div class="module-header mini">年龄分布</div>
              <AgeChart :data="ageData" />
            </div>
            <div class="sub-item">
              <div class="module-header mini">服务类型</div>
              <TypeChart :data="typeData" />
            </div>
          </div>
        </div>
      </aside>
    </main>

    <transition name="drawer">
      <div v-if="detailVisible" class="detail-drawer">
        <div class="drawer-inner">
          <div class="drawer-header">
            <h3>服务工单详情</h3>
            <button @click="detailVisible = false">×</button>
          </div>
          <div class="drawer-body">
            <div class="info-group">
              <div class="user-main">
                <div class="avatar">{{ detailItem.rName?.charAt(0) }}</div>
                <div class="name-box">
                  <h4>{{ detailItem.rName }}</h4>
                  <p>{{ detailItem.rPhone }}</p>
                </div>
              </div>
            </div>
            <div class="data-grid">
              <div class="grid-cell">
                <label>服务内容</label>
                <div class="val highlight">{{ svcMap[detailItem.serviceType] }}</div>
              </div>
              <div class="grid-cell">
                <label>当前状态</label>
                <div class="val" :class="statusClass(detailItem.status)">{{ detailItem.status }}</div>
              </div>
              <div class="grid-cell full">
                <label>发布时间</label>
                <div class="val">{{ formatTime(detailItem.publishTime) }}</div>
              </div>
            </div>
            <button class="action-btn">呼叫负责人</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '../api/stat.js';
import { mockManagers, mockVolunteers } from '../data/mockUsers.js';

import TheHeader from '../components/TheHeader.vue';
import MapContainer from './MapContainer.vue';
import PlaybackPanel from './PlaybackPanel.vue';
import Cards from './Cards.vue';
import AgeChart from './Charts/AgeChart.vue';
import TypeChart from './Charts/TypeChart.vue';
import TrendChart from './Charts/TrendChart.vue';
import { usePlayback } from '../views/usePlayback.js';

const router = useRouter();

// 核心数据
const orders = ref([]);
const managers = ref([...mockManagers]);
const volunteers = ref([...mockVolunteers]);
const heatmap = ref(false);
const detailItem = ref({});
const detailVisible = ref(false);
const svcMap = { 0: '基础照护', 1: '陪护服务', 2: '送餐服务', 3: '清洁服务', 4: '心理疏导' };

// 状态控制
const currentScale = ref('day');
const playbackScale = ref('day');
const scaleMap = { day: '日视图', week: '周视图', month: '月视图' };
const selectedDate = ref(new Date('2025-01-21 00:00:00'));

// 播放逻辑 Hook
const {
  displayOrders, isPlaying, playProgress, currentTimeDisplay,
  timeAxisTicks, startMapPlayback, stopPlayback, initDisplayOrders, seekToPercent
} = usePlayback(orders, heatmap, playbackScale, selectedDate);

// 图表数据
const ageData = ref([]);
const typeData = ref([]);
const peakInfo = ref({ time: '10:00', value: 12 });

const kpiData = computed(() => ({
  '今日总单量': orders.value.length,
  '待响应': Math.floor(orders.value.length * 0.15),
  '运行中': Math.floor(orders.value.length * 0.45),
  '已覆盖社区': 24
}));

const selectedDateStr = computed(() => {
  const d = selectedDate.value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

const statusClass = (status) => status === '已完成' ? 'text-green' : 'text-orange';

async function fetchAll() {
  try {
    const list = await api.listServiceOrders();
    orders.value = (list || []).map(item => ({
      ...item,
      rName: item.rName || '未知人员',
      rPhone: item.rPhone || '无',
      rLat: parseFloat(item.rLat || 0),
      rLng: parseFloat(item.rLng || 0),
      serviceType: item.serviceType ?? 0,
      status: item.status || '进行中',
      publishTime: item.publishTime || item.publish_time
    }));
    initDisplayOrders();
    ageData.value = await api.statElderlyAge(60, 70, 80);
    typeData.value = await api.statServiceType();
  } catch (e) {
    console.error('Data loading error:', e);
  }
}

function openDetail(item) {
  detailItem.value = item;
  detailVisible.value = true;
}

function formatTime(t) { return t ? new Date(t).toLocaleString() : '无'; }
function toggleHeatmap() { heatmap.value = !heatmap.value; }
function goAnalysis() { router.push('/analysis'); }
function goList() { router.push('/requesters'); }

onMounted(() => fetchAll());
</script>

<style scoped>
/* 采用深色科技感主题 */
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0b0f1a; /* 深蓝底色 */
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* KPI 概览栏 */
.kpi-overview {
  display: flex;
  justify-content: space-around;
  background: linear-gradient(180deg, #161b2d 0%, #0b0f1a 100%);
  padding: 15px 0;
  border-bottom: 1px solid #1e293b;
}
.kpi-item { text-align: center; }
.kpi-value { font-size: 28px; font-weight: bold; color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
.kpi-label { font-size: 12px; color: #94a3b8; margin-top: 4px; }

.main {
  display: flex;
  flex: 1;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}

/* 指挥监控面板 */
.left-panel {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-radius: 12px;
  border: 1px solid #1e293b;
  overflow: hidden;
}
.panel-header {
  padding: 12px 20px;
  background: rgba(31, 41, 55, 0.5);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-title { font-weight: bold; color: #60a5fa; }
.map-container-box { flex: 1; position: relative; }

/* 决策分析面板 */
.right-panel {
  flex: 0.8;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.side-module {
  background: #111827;
  border-radius: 12px;
  border: 1px solid #1e293b;
  padding: 16px;
}
.module-header {
  font-size: 14px;
  font-weight: bold;
  color: #94a3b8;
  margin-bottom: 12px;
  border-left: 3px solid #3b82f6;
  padding-left: 8px;
  display: flex;
  justify-content: space-between;
}
.module-header.mini { font-size: 12px; }

.sub-charts { display: flex; gap: 12px; height: 180px; }
.sub-item { flex: 1; }

.flex-grow { flex: 1; }
.peak-indicator {
  text-align: center;
  font-size: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  padding: 4px;
  border-radius: 4px;
  margin-top: 8px;
}

/* 详情抽屉 */
.detail-drawer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;
}
.drawer-inner {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  background: #111827;
  box-shadow: -5px 0 20px rgba(0,0,0,0.5);
  padding: 24px;
}
.drawer-header { display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 16px; }
.avatar { width: 48px; height: 48px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
.grid-cell.full { grid-column: span 2; }
.grid-cell label { font-size: 12px; color: #94a3b8; }
.grid-cell .val { font-size: 14px; margin-top: 4px; font-weight: bold; }
.action-btn { width: 100%; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; }

/* 颜色 */
.text-green { color: #10b981; }
.text-orange { color: #f59e0b; }
.highlight { color: #3b82f6; }

/* 动画 */
.drawer-enter-active, .drawer-leave-active { transition: transform 0.3s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>这一版代码，修改的地方全告诉我，我自己改