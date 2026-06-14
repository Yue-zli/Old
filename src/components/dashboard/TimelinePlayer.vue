<!-- TODO: 4D 时空漫游 — 时间轴播放控件（三层叠加） -->
<template>
  <div class="tl-wrap">
    <!-- 播放/暂停/停止 + 时间标签 + 日/周/月切换 -->
     <div class="tl-controls">
      <button class="tl-btn play-btn" @click="$emit(isPlaying?'pause':'play')"
      :title="isPlaying?'暂停':'播放'">
        {{ isPlaying?'⏸' : '▶' }}
      </button>
      <button class="tl-btn stop-btn" @click="$emit('stop')" title="停止">⏹</button>
      <span class="tl-time" :class="{ live:isPlaying }">{{ currentTimeLabel || '--' }}</span>
      <span class="tl-spacer"></span>
      <div class="tl-tabs">
        <button v-for="(label,key) in scaleMap" :key="key"
        :class="{ on: scale === key }"
        @click="$emit('change-scale', key)">{{ label }}</button>
      </div>
     </div>

     <!--三层时间轴-->
     <div class="tl-track-wrap" ref="trackWrap"
          @mousemove="onTrackHover"
          @mouseleave="tooltipVisible=false">
        <!--Layer1: Echarts柱状图-->
        <div ref="chartRef" class="tl-chart-layer"></div>

        <!--Layer2: -->
        <div class="tl-hightlight" :style="{width: playProgress+'%'}"></div>
        <input type="range" class="tl-slider"
        :min="0" :max="Math.max(0, (timeAxisKeys?.length || 1) -1)"
        :value="currentIndex"
        @input="onSliderInput"
        />
        <div v-if="tooltipVisible && hoverBucket" class="tl-tooltip" :style="tooltipStyle">
          <div class="tt-date">{{ hoverBucket.key }}</div>
          <div class="tt-count">订单：<b>{{ hoverBucket.count }}</b>单</div>
        </div>
      </div>
  </div>
</template>

<script setup>
// TODO: 实现三层绝对定位叠加的时间轴控件
// props: isPlaying, playProgress, currentTimeLabel, timeAxisKeys, orderCountPerBucket, currentIndex, scale, scaleMap
// emits: play, pause, stop, seek, change-scale
import{ ref,computed,onMounted, watch, nextTick, onBeforeUnmount} from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  isPlaying: Boolean,
  playProgress: Number,
  currentTimeLabel:String,
  timeAxisKeys: { type:Array, default: ()=> []},
  orderCountPerBucket: {type:Array, default: ()=>[]},
  currentIndex: Number,
  scale:String,
  scaleMap: Object
});

const emit = defineEmits(['play','pause', 'stop','seek','change-scale']);

//====ECharts====
const chartRef=ref(null);
let chart=null;

function initChart() {
  if(!chartRef.value) return;
  chart=echarts.init(chartRef.value);
  updateChart();
}

function updateChart() {
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
      barCategoryGap: 0
    }],
    animation: false
  }, true);  // true = 不合并旧配置，全量替换
}

watch(()=>props.orderCountPerBucket, ()=>updateChart());

function onSliderInput(e) {
  emit('seek', parseInt(e.target.value));
}

const tooltipVisible =ref(false);
const hoverBucket = ref(null);
const tooltipX=ref(0);
const tooltipY=ref(0);
const tooltipStyle = computed(()=>({
  left: tooltipX.value+'px',
  top: tooltipY.value+'px'
}));

const trackWrap=ref(null);

function onTrackHover(e) {
  const wrap = trackWrap.value;
  if(!wrap ||!props.timeAxisKeys?.length) return;
  const rect = wrap.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const ratio=x/rect.width;
  const idx=Math.round(ratio*(props.timeAxisKeys.length-1));
  const clamped=Math.max(0, Math.min(props.timeAxisKeys.length-1,idx));

  const rawKey = props.timeAxisKeys[clamped];
  hoverBucket.value = {
    key: props.scale === 'month' ? rawKey.replace(/^\d+\//, '') + '日' : rawKey,
    count: props.orderCountPerBucket?.[clamped] || 0
  };
  tooltipVisible.value=true;
  tooltipX.value=Math.min(x,rect.width-120);
  tooltipY.value=-50;
}

onMounted(async()=> {
  await nextTick();
  initChart();
});

onBeforeUnmount(() => {
  chart?.dispose();
});

defineExpose({resize: ()=> chart?.resize?.()});
</script>

<style scoped>
/* TODO: 暗色科技风样式 */
.tl-wrap { 
  width:100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tl-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(56,189,248,0.25);
  background: rgba(56,189,248,0.08);
  color: #38bdf8;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.tl-btn:hover{
  background: rgba(56,189,248,0.2);
}

.stop-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #f87171; }
.tl-time {
  font-family: "Orbitron","Courier New",monospace; font-size: 13px;
  font-weight: 600; color: #64748b; min-width: 80px; text-align: center; flex-shrink: 0;
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
  position: relative; height: 56px; cursor: pointer;
  border-radius: 6px; overflow: visible; background: rgba(0,0,0,0.3);
}
.tl-chart-layer { position: absolute; inset: 0; z-index: 1; }
.tl-hightlight {
  position: absolute; top: 0; left: 0; bottom: 0; z-index: 2;
  background: linear-gradient(90deg, rgba(56,189,248,0.18), rgba(56,189,248,0.08));
  border-right: 2px solid rgba(56,189,248,0.5);
  pointer-events: none; transition: width 0.3s linear;
}
.tl-slider {
  position: absolute; inset: 0; z-index: 3;
  width: 100%; height: 100%; -webkit-appearance: none; appearance: none;
  background: transparent; cursor: pointer; margin: 0;
}
.tl-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 2px solid #38bdf8;
  box-shadow: 0 0 10px rgba(56,189,248,0.6), 0 2px 6px rgba(0,0,0,0.4);
  cursor: grab;
}
.tl-slider::-webkit-slider-thumb:active { transform: scale(1.3); cursor: grabbing; }

/* ---- 悬浮提示 ---- */
.tl-tooltip {
  position: absolute; z-index: 10; background: rgba(15,23,42,0.95);
  border: 1px solid rgba(56,189,248,0.3); border-radius: 6px;
  padding: 8px 12px; font-size: 11px; color: #cbd5e1;
  pointer-events: none; white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.tt-date { color: #38bdf8; font-weight: 600; margin-bottom: 4px; }
.tt-count b { color: #fff; }


</style>
