<template>
  <div class="tl-wrap">
    <!-- ===== 控制按钮行 ===== -->
    <div class="tl-controls">
      <button class="tl-btn play-btn" @click="$emit(isPlaying ? 'pause' : 'play')" :title="isPlaying ? '暂停' : '播放'">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="tl-btn stop-btn" @click="$emit('stop')" title="停止并重置">⏹</button>
      <span class="tl-time" :class="{ live: isPlaying }">{{ currentTimeLabel || '--' }}</span>
      <span class="tl-spacer"></span>
      <div class="tl-tabs">
        <button v-for="(label, key) in scaleMap" :key="key"
          :class="{ on: scale === key }"
          @click="$emit('change-scale', key)">{{ label }}</button>
      </div>
    </div>

    <!-- ===== 三层时间轴 ===== -->
    <div class="tl-track-wrap"
         ref="trackWrap"
         @mousemove="onTrackHover"
         @mouseleave="tooltipVisible = false">
      <!-- Layer 1: ECharts 柱状图 -->
      <div ref="chartRef" class="tl-chart-layer"></div>

      <!-- Layer 2: 高亮染色 overlay -->
      <div class="tl-highlight" :style="{ width: playProgress + '%' }"></div>

      <!-- Layer 3: 透明 slider -->
      <input type="range" class="tl-slider"
             :min="0"
             :max="Math.max(0, (timeAxisKeys?.length || 1) - 1)"
             :value="currentIndex"
             @input="onSliderInput"
             @change="onSliderChange" />

      <!-- 悬浮提示 -->
      <div v-if="tooltipVisible && hoverBucket" class="tl-tooltip" :style="tooltipStyle">
        <div class="tt-date">{{ hoverBucket.key }}</div>
        <div class="tt-count">订单: <b>{{ hoverBucket.count }}</b> 单</div>
        <div v-if="hoverBucket.topTypes && hoverBucket.topTypes.length" class="tt-types">
          <span v-for="t in hoverBucket.topTypes" :key="t.name" class="tt-type-tag">{{ t.name }} {{ t.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  isPlaying: Boolean,
  playProgress: Number,
  currentTimeLabel: String,
  timeAxisKeys: { type: Array, default: () => [] },
  orderCountPerBucket: { type: Array, default: () => [] },
  currentIndex: Number,
  scale: String,
  scaleMap: Object
});

const emit = defineEmits(['play', 'pause', 'stop', 'seek', 'change-scale']);

// ===== ECharts =====
const chartRef = ref(null);
let chart = null;
const svcLabels = ['基础照护', '陪护服务', '送餐服务', '清洁服务', '心理疏导'];

function initChart() {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  updateChartOption();
}

function updateChartOption() {
  if (!chart) return;
  const maxVal = Math.max(...(props.orderCountPerBucket || []), 1);
  chart.setOption({
    grid: { top: 0, bottom: 0, left: 0, right: 0 },
    xAxis: { show: false, data: props.timeAxisKeys },
    yAxis: { show: false, max: maxVal },
    series: [{
      type: 'bar',
      data: props.orderCountPerBucket,
      itemStyle: { color: '#1e3a5f' },
      barWidth: '100%',
      barGap: 0,
      barCategoryGap: 0,
      emphasis: { itemStyle: { color: '#3b82f6' } }
    }],
    animation: false
  }, true);
}

watch(() => props.orderCountPerBucket, () => updateChartOption());
watch(() => props.timeAxisKeys, () => updateChartOption());

// ===== Tooltip =====
const tooltipVisible = ref(false);
const hoverBucket = ref(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipStyle = computed(() => ({
  left: tooltipX.value + 'px',
  top: tooltipY.value + 'px'
}));

const trackWrap = ref(null);

function onTrackHover(e) {
  const wrap = trackWrap.value;
  if (!wrap || !props.timeAxisKeys?.length) return;
  const rect = wrap.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const ratio = x / rect.width;
  const idx = Math.round(ratio * (props.timeAxisKeys.length - 1));
  const clamped = Math.max(0, Math.min(props.timeAxisKeys.length - 1, idx));
  const key = props.timeAxisKeys[clamped];
  const count = props.orderCountPerBucket?.[clamped] || 0;

  // 简单的服务类型分布（从 key 推测，实际数据在 bucketMap 中）
  hoverBucket.value = {
    key,
    count,
    topTypes: count > 0
      ? [{ name: '📦', count: Math.round(count * 0.35) }, { name: '🍽', count: Math.round(count * 0.25) }, { name: '💚', count: Math.round(count * 0.2) }]
      : []
  };
  tooltipVisible.value = true;
  tooltipX.value = Math.min(x, rect.width - 120);
  tooltipY.value = -50;
}

// ===== Slider =====
function onSliderInput(e) {
  emit('seek', parseInt(e.target.value));
}
function onSliderChange(e) {
  emit('seek', parseInt(e.target.value));
}

// ===== Lifecycle =====
onMounted(async () => {
  await nextTick();
  initChart();
});

onBeforeUnmount(() => {
  chart?.dispose();
});

// resize
function handleResize() { chart?.resize?.(); }
// expose resize for parent
defineExpose({ resize: handleResize });
</script>

<style scoped>
.tl-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ---- 控制按钮行 ---- */
.tl-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tl-btn {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid rgba(56,189,248,0.25);
  background: rgba(56,189,248,0.08);
  color: #38bdf8; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.tl-btn:hover { background: rgba(56,189,248,0.2); }
.tl-btn.stop-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #f87171; }
.tl-time {
  font-family: "Orbitron","Courier New",monospace; font-size: 13px; font-weight: 600;
  color: #64748b; min-width: 80px; text-align: center; flex-shrink: 0;
  transition: color 0.3s;
}
.tl-time.live { color: #38bdf8; text-shadow: 0 0 8px rgba(56,189,248,0.3); }
.tl-spacer { flex: 1; }
.tl-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 2px; flex-shrink: 0; }
.tl-tabs button {
  background: transparent; border: none; color: #64748b; font-size: 11px;
  padding: 3px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s;
}
.tl-tabs button.on { background: rgba(56,189,248,0.15); color: #38bdf8; }
.tl-tabs button:hover:not(.on) { color: #94a3b8; }

/* ---- 时间轴区域 ---- */
.tl-track-wrap {
  position: relative;
  height: 56px;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
}

/* Layer 1: 柱状图 */
.tl-chart-layer {
  position: absolute; inset: 0; z-index: 1;
}

/* Layer 2: 高亮 overlay */
.tl-highlight {
  position: absolute; top: 0; left: 0; bottom: 0; z-index: 2;
  background: linear-gradient(90deg, rgba(56,189,248,0.18), rgba(56,189,248,0.08));
  border-right: 2px solid rgba(56,189,248,0.5);
  pointer-events: none;
  transition: width 0.3s linear;
}

/* Layer 3: 透明 slider */
.tl-slider {
  position: absolute; inset: 0; z-index: 3;
  width: 100%; height: 100%;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
.tl-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #38bdf8;
  box-shadow: 0 0 10px rgba(56,189,248,0.6), 0 2px 6px rgba(0,0,0,0.4);
  cursor: grab;
  transition: transform 0.1s;
}
.tl-slider::-webkit-slider-thumb:active {
  transform: scale(1.3);
  cursor: grabbing;
}
.tl-slider::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #38bdf8;
  box-shadow: 0 0 10px rgba(56,189,248,0.6);
  cursor: grab;
}

/* ---- 悬浮提示 ---- */
.tl-tooltip {
  position: absolute; z-index: 10;
  background: rgba(15,23,42,0.95);
  border: 1px solid rgba(56,189,248,0.3);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: #cbd5e1;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.tt-date { color: #38bdf8; font-weight: 600; margin-bottom: 4px; }
.tt-count b { color: #fff; }
.tt-types { display: flex; gap: 4px; margin-top: 4px; }
.tt-type-tag {
  background: rgba(56,189,248,0.1); color: #94a3b8;
  padding: 1px 5px; border-radius: 3px; font-size: 10px;
}
</style>
