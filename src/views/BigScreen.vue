<template>
  <div class="cockpit">
    <!-- ===== 地图铺满全屏 ===== -->
    <div class="map-full">
      <MapContainer
      :services="displayOrders"
      :heatmap="heatmap"
      :currentMode="currentMode"
      @marker-click="openDetail"
      :trailingData="trailingData"
      :isSpacetimePlaying="spacetimeIsPlaying"/>
    </div>

    <!-- ===== 悬浮标题（顶部居中） ===== -->
    <header class="hud-title-bar">
      <span class="hud-line"></span>
      <span class="hud-text">南昌养老 · 时空分析决策平台</span>
      <span class="hud-line"></span>
    </header>

    <!-- ===== 悬浮面板（左侧） ===== -->
    <aside class="float-panel">
      <!-- 十字准星角标 -->
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>

      <div class="panel-scroll">
        <!-- KPI -->
        <div class="kpi-row">
          <div class="kpi"><em>{{ totalStats.total }}</em><span>订单总量</span></div>
          <div class="kpi"><em>{{ managers.length }}</em><span>在岗管理</span></div>
          <div class="kpi"><em>{{ volunteers.length }}</em><span>注册志愿</span></div>
        </div>

        <!-- 操作栏 -->
        <div class="ctrl-bar">
          <button :class="{ on: currentMode === 'demand' }" @click="handleModeSwitch('demand')">实时监控</button>
          <button :class="{ on: currentMode === 'evaluation' }" @click="handleModeSwitch('evaluation')">资源评价</button>
          <span class="gap"></span>
          <button :class="{ active: heatmap }" @click="toggleHeatmap"><i class="dot" :class="{ lit: heatmap }"></i>{{ heatmap ? '热力' : '点位' }}</button>
          <button class="primary" @click="goCoverage"><i class="dot lit" style="background:#22d3ee"></i>选址分析</button>
        </div>

        <!-- 图表 -->
        <div class="charts">
          <div class="ch"><AgeChart :data="ageData" /></div>
          <div class="ch"><GenderChart :data="genderData" /></div>
          <div class="ch tall"><TrendChart ref="trendChart" v-model:currentScale="currentScale" v-model:selectedDate="selectedDate" /></div>
          <div class="ch"><TypeChart :data="typeData" /></div>
        </div>
        <div v-if="peakInfo.value" class="peak">高峰 <b>{{ peakInfo.time }}</b> · {{ peakInfo.value }}单</div>
      </div>
    </aside>

    <!-- ===== 悬浮信息栏（底部） ===== -->
    <div class="float-bottom">
      <span>{{ modeIcon }} {{ modeTitle }}</span>
      <span class="date">{{ selectedDateStr }}</span>
      <span class="spacer"></span>
      <TimelinePlayer
        :isPlaying="spacetimeIsPlaying"
        :playProgress="spacetimePlayProgress"
        :currentTimeLabel="currentTimeLabel"
        :timeAxisKeys="timeAxisKeys"
        :orderCountPerBucket="orderCountPerBucket"
        :currentIndex="currentIndex"
        :scale="playbackScale"
        :scaleMap="scaleMap"
        @play="spacetimePlay"
        @pause="spacetimePause"
        @stop="spacetimeStop"
        @seek="seek"
        @change-scale="handlePlaybackScaleChange"

      />
    </div>

    <!-- ===== 地图视口十字准星 ===== -->
    <div class="reticle">
      <span class="rt tl"></span><span class="rt tr"></span>
      <span class="rt bl"></span><span class="rt br"></span>
    </div>

    <DetailPanel :visible="detailVisible" :item="detailItem" @close="detailVisible = false" />
  </div>
</template>

<script setup>
import { useDashboardState } from '../hooks/useDashboardState.js';
const {
  currentMode, modeTitle, modeIcon, handleModeSwitch,
  orders, managers, volunteers, heatmap,
  totalStats, selectedDateStr,
  detailItem, detailVisible, openDetail,
  ageData, genderData, typeData, peakInfo, trendChart,
  currentScale, selectedDate, playbackScale, scaleMap,
  displayOrders, isPlaying, playProgress, currentTimeDisplay,
  timeAxisTicks, startMapPlayback, stopPlayback, seekToPercent, initDisplayOrders,
  toggleHeatmap, goAnalysis, goCoverage, goList,
  //===4D时空漫游
  timeAxisKeys,orderCountPerBucket,currentIndex,currentTimeLabel,
  trailingData,
  spacetimeIsPlaying,
  spacetimePlay,spacetimePause,spacetimeStop,
  spacetimePlayProgress,
  seek,
  handlePlaybackScaleChange
} = useDashboardState();

import MapContainer from '../components/dashboard/MapContainer.vue';
import PlaybackPanel from '../components/dashboard/PlaybackPanel.vue';
import AgeChart from '../components/dashboard/charts/AgeChart.vue';
import GenderChart from '../components/dashboard/charts/GenderChart.vue';
import TypeChart from '../components/dashboard/charts/TypeChart.vue';
import TrendChart from '../components/dashboard/charts/TrendChart.vue';
import DetailPanel from '../components/dashboard/DetailPanel.vue';
import TimelinePlayer from '../components/dashboard/TimelinePlayer.vue';
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap');
</style>

<style scoped>
/* ============================================
   全屏沉浸 · 数字孪生指挥舱
   ============================================ */
.cockpit {
  position: relative; width: 100vw; height: 100vh;
  background: #020617; overflow: hidden;
  font-family: "PingFang SC","Inter",system-ui,sans-serif;
}

/* ---- 地图铺满 ---- */
.map-full {
  position: absolute; inset: 0; z-index: 1;
}

/* ---- 视口十字准星 ---- */
.reticle { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.rt {
  position: absolute; width: 20px; height: 20px;
  border-color: rgba(56,189,248,0.25); border-style: solid;
}
.rt.tl { top: 12px; left: 12px; border-width: 1px 0 0 1px; }
.rt.tr { top: 12px; right: 12px; border-width: 1px 1px 0 0; }
.rt.bl { bottom: 12px; left: 12px; border-width: 0 0 1px 1px; }
.rt.br { bottom: 12px; right: 12px; border-width: 0 1px 1px 0; }

/* ---- 悬浮标题 ---- */
.hud-title-bar {
  position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 14px; z-index: 20; pointer-events: none;
}
.hud-line { width: 50px; height: 1px; background: linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent); }
.hud-text { font-size: 13px; font-weight: 500; letter-spacing: 3px; color: rgba(148,163,184,0.65); text-shadow: 0 0 16px rgba(96,165,250,0.15); }

/* ===== 悬浮面板（左侧） ===== */
.float-panel {
  position: absolute; left: 14px; top: 60px; bottom: 60px;
  width: 390px; z-index: 10;
  background: rgba(10,15,28,0.78);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border-radius: 12px;
  border: 1px solid rgba(56,189,248,0.12);
  box-shadow: 0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.02);
  display: flex; flex-direction: column; overflow: hidden;
}

/* 四角L形装饰 */
.corner { position: absolute; width: 10px; height: 10px; pointer-events: none; z-index: 2; border-color: rgba(56,189,248,0.35); border-style: solid; }
.corner.tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
.corner.tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
.corner.bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
.corner.br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }

/* 滚动区 */
.panel-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
}
.panel-scroll::-webkit-scrollbar { width: 3px; }
.panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.panel-scroll::-webkit-scrollbar-track { background: transparent; }

/* ---- KPI ---- */
.kpi-row { display: flex; gap: 6px; flex-shrink: 0; }
.kpi { flex: 1; text-align: center; background: rgba(255,255,255,0.02); border-radius: 10px; padding: 12px 0; }
.kpi em {
  display: block; font-style: normal;
  font-family: "Orbitron","DIN Alternate","Inter",monospace;
  font-size: 26px; font-weight: 700;
  background: linear-gradient(180deg, #e2e8f0, #60a5fa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.kpi span { font-size: 9px; color: #475569; letter-spacing: 2px; margin-top: 2px; display: block; }

/* ---- 操作栏 ---- */
.ctrl-bar { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.ctrl-bar button {
  position: relative;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #64748b;
  font-size: 11px; font-weight: 500; padding: 5px 12px 5px 22px; border-radius: 6px; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1); white-space: nowrap;
}
.ctrl-bar button:hover { color: #cbd5e1; border-color: rgba(255,255,255,0.1); }
.ctrl-bar button.on { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); color: #93c5fd; }
.ctrl-bar button.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.25); color: #f59e0b; }
.ctrl-bar button.primary { background: rgba(34,211,238,0.1); border-color: rgba(34,211,238,0.2); color: #22d3ee; }
.ctrl-bar .gap { flex: 1; }
/* 状态指示灯 */
.ctrl-bar button i.dot {
  position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
  width: 5px; height: 5px; border-radius: 50%; background: #334155;
  transition: all 0.3s;
}
.ctrl-bar button i.dot.lit { background: #22d3ee; box-shadow: 0 0 6px rgba(34,211,238,0.6); }

/* ---- 图表 ---- */
.charts { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.ch { min-height: 0; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.015); flex: 1; }
.ch.tall { flex: 2; }
:deep(.chart-container) { width: 100% !important; height: 100% !important; background: transparent !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
.peak { text-align: center; font-size: 10px; color: #64748b; flex-shrink: 0; }
.peak b { color: #f59e0b; }

/* ---- 底部信息栏 ---- */
.float-bottom {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
  width: 70%; max-width: 900px; z-index: 10;
  display: flex; align-items: center; gap: 14px;
  padding: 6px 20px;
  background: rgba(10,15,28,0.78); backdrop-filter: blur(20px);
  border-radius: 20px; border: 1px solid rgba(56,189,248,0.1);
  box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  font-size: 12px; color: #94a3b8;
}
.float-bottom .date { font-size: 11px; color: #475569; }
.float-bottom .spacer { flex: 1; }
</style>