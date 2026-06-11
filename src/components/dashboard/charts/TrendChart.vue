<template>
  <div class="trend-chart-container">
    <div class="trend-header">
      <div class="trend-info">
        <span class="main-title">{{ scaleMap[currentScale] }}需求趋势分析</span>
        <span class="total-badge">
          共 <strong>{{ totalCount }}</strong> 单
        </span>
      </div>

      <div class="time-tabs">
        <button
          v-for="(label, key) in scaleMap"
          :key="key"
          :class="{ active: currentScale === key }"
          @click="changeScale(key)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <div v-if="currentScale !== 'year'" class="date-selector-bar">
      <button class="nav-arrow" @click="offsetTime(-1)">◀</button>
      
      <div class="date-picker-wrapper" @click="openDatePicker">
        <span class="current-date-text">
          {{ currentScale === 'day' ? selectedDateStr : 
             currentScale === 'week' ? weekRangeStr : 
             selectedDate.getFullYear() + '年' + (selectedDate.getMonth() + 1) + '月' }}
        </span>
        <input 
          ref="dateInputRef"
          v-if="currentScale === 'day'"
          type="date"
          class="hidden-date-input"
          :value="selectedDateStr"
          @input="onDateChange"
        />
      </div>

      <button class="nav-arrow" @click="offsetTime(1)">▶</button>
    </div>

    <div ref="hourChartRef" class="chart-box"></div>

    <div v-if="peakInfo.value" class="peak-tag">
      <span class="peak-icon">📊</span>
      高峰时段: <span class="highlight">{{ peakInfo.time }}</span> 
      (累计 <span class="highlight">{{ peakInfo.value }}</span> 单)
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import * as api from '../../../api/stat.js';

const props = defineProps({
  currentScale: { type: String, default: 'day' },
  // 默认演示日期
  selectedDate: { type: Date, default: () => new Date('2025-01-21') }
});

const emit = defineEmits(['update:currentScale', 'update:selectedDate']);

const hourChartRef = ref(null);
let hourE = null;
const peakInfo = ref({ time: '', value: 0 });
const totalCount = ref(0);
const scaleMap = { day: '日', week: '周', month: '月' };
// 服务类型映射
const svcMap = { 0: '基础照护', 1: '陪护服务', 2: '送餐服务', 3: '清洁服务', 4: '心理疏导' };

// ⭐ 基础色板（去掉过于鲜艳的颜色，使用更稳重的商务色）
const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const dateInputRef = ref(null);

const selectedDateStr = computed(() => {
  const d = props.selectedDate;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

// ⭐ 新增：计算周维度的开始和结束日期文字
const weekRangeStr = computed(() => {
  const baseDate = new Date(props.selectedDate);
  const day = baseDate.getDay() || 7; // 周几，周日为7
  
  const mon = new Date(baseDate); 
  mon.setDate(baseDate.getDate() - day + 1); // 本周一
  
  const sun = new Date(mon); 
  sun.setDate(mon.getDate() + 6); // 本周日

  const formatShort = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  
  // 格式：01/20 - 01/26
  return `${formatShort(mon)} - ${formatShort(sun)}`;
});

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

async function offsetTime(direction) {
  const newDate = new Date(props.selectedDate);
  if (props.currentScale === 'day') newDate.setDate(newDate.getDate() + direction);
  else if (props.currentScale === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
  else if (props.currentScale === 'month') newDate.setMonth(newDate.getMonth() + direction);
  emit('update:selectedDate', newDate);
}

function onDateChange(e) {
  if (e.target.value) {
    emit('update:selectedDate', new Date(e.target.value));
  }
}

//强制弹出日历面板
function openDatePicker() {
  if(props.currentScale === 'day' && dateInputRef.value){
    if(dateInputRef.value.showPicker) {
      dateInputRef.value.showPicker();
    }else{
      dateInputRef.value.click();
    }
  }
}

async function changeScale(scale) {
  emit('update:currentScale', scale);
  // 切换维度时跳转到有数据的演示日期
  emit('update:selectedDate', new Date('2025-01-21')); 
}

async function updateTrendChart() {
  if (!hourChartRef.value) return;
  if (!hourE) hourE = echarts.init(hourChartRef.value);

  const baseDate = new Date(props.selectedDate);
  const dateStr = formatDate(baseDate);
  let startTime = `${dateStr} 00:00:00`, endTime = `${dateStr} 23:59:59`;

  if (props.currentScale === 'week') {
    const day = baseDate.getDay() || 7;
    const mon = new Date(baseDate); mon.setDate(baseDate.getDate() - day + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    startTime = `${formatDate(mon)} 00:00:00`; endTime = `${formatDate(sun)} 23:59:59`;
  } else if (props.currentScale === 'month') {
    const first = new Date(ullYear(), baseDate.getMonth(), 1);
    const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    startTime = `${formatDate(first)} 00:00:00`; endTime = `${formatDate(last)} 23:59:59`;
  }

  try {
    const res = await api.statServicePublishTime(props.currentScale, startTime, endTime);
    const data = res?.data || res || [];

    // 1. 初始化 X 轴
    let times = [];
    if (props.currentScale === 'day') {
      times = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);
    } else {
      times = [...new Set(data.map(i => i.publishTime || i.PUBLISHTIME || i.name || ""))].filter(t => t).sort();
    }

    // 2. 初始化数据容器
    const seriesData = {};
    Object.values(svcMap).forEach(name => seriesData[name] = new Array(times.length).fill(0));
    const timeTotals = new Array(times.length).fill(0);

    // 3. 容错装载逻辑
    let matchCount = 0;
    data.forEach(item => {
      const rawT = String(item.publishTime || item.PUBLISHTIME || item.publishtime || item.name || "").trim();
      const sType = item.serviceType ?? item.SERVICETYPE ?? item.service_type ?? 0;
      const count = Number(item.count ?? item.COUNT ?? item.value ?? 0);
      const sName = svcMap[sType] || '其他服务';

      if (props.currentScale === 'day') {
        const hourMatch = rawT.match(/(\d{1,2})/);
        if (hourMatch) {
          const hIdx = parseInt(hourMatch[1], 10);
          if (hIdx >= 0 && hIdx < 24) {
            matchCount++;
            seriesData[sName][hIdx] += count;
            timeTotals[hIdx] += count;
          }
        }
      } else {
        const tIdx = times.indexOf(rawT);
        if (tIdx !== -1) {
          matchCount++;
          seriesData[sName][tIdx] += count;
          timeTotals[tIdx] += count;
        }
      }
    });

    // 4. 计算高峰
    let maxT = 0, pTime = '无';
    timeTotals.forEach((v, i) => { if (v > maxT) { maxT = v; pTime = times[i]; } });
    peakInfo.value = { time: pTime, value: maxT };
    totalCount.value = timeTotals.reduce((a, b) => a + b, 0);

    // ⭐ 5. 渲染 ECharts（基础直折线风格）
    const series = Object.keys(seriesData).map((name, index) => {
      return {
        name,
        type: 'line',
        stack: 'Total', // 堆叠
        smooth: false, // ⭐ 关闭平滑曲线，改回直折线
        symbol: 'circle', // 悬停时显示圆点
        symbolSize: 4,
        showSymbol: false, // 默认隐藏圆点
        lineStyle: { width: 1 }, // 线条变细
        areaStyle: { // ⭐ 基础填充：使用色板原色，低透明度，去掉渐变
          opacity: 0.3 
        },
        emphasis: { // 悬停时高亮
          focus: 'series'
        },
        data: seriesData[name]
      };
    });

  hourE.setOption({
      backgroundColor: 'transparent', // ⭐ 背景设为透明
      color: ['#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444'], // 科技蓝绿板
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // 深色背景
        borderColor: '#3b82f6',
        textStyle: { color: '#fff', fontSize: 11 },
        axisPointer: { type: 'line', lineStyle: { color: '#3b82f6', type: 'dashed' } }
      },
      legend: {
        data: Object.values(svcMap),
        bottom: '1%',
        textStyle: { fontSize: 10, color: '#94a3b8' }, // 浅灰色文字
        icon: 'circle'
      },
      xAxis: { 
        type: 'category', 
        data: times,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#1e293b' } } // 极淡的分割线
      },
      yAxis: { 
        type: 'value',
        name: '(单)',
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }, // ⭐ 虚线深色网格
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        nameTextStyle: { color: '#94a3b8' }
      },
      series: series // 这里的 series 内部 areaStyle 的 opacity 建议调成 0.2 更有质感
    }, true);
  } catch (e) { console.error("渲染失败:", e); }
}

const resize = () => hourE?.resize();
defineExpose({ resize });

watch([() => props.currentScale, () => props.selectedDate], () => nextTick(updateTrendChart), { deep: true });
onMounted(updateTrendChart);
onBeforeUnmount(() => hourE?.dispose());
</script>

<style scoped>
/* 基础商务风格 CSS */
.trend-chart-container { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
  min-height: 0;
  font-family: "PingFang SC","Microsoft YaHei", sans-serif; 
  overflow: hidden;
  color: #fff;
}
.trend-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding-bottom: 8px; 
  border-bottom: 1px solid rgba(59, 130, 246, 0.2); 
  margin-bottom: 10px;
  flex-shrink: 0;
}
.main-title { font-weight: bold; color: #60a5fa; font-size: 14px;
  letter-spacing: 1px; }
.total-badge { font-size: 11px; background: rgba(30, 58, 138, 0.3);
  color: #60a5fa;
  padding: 2px 10px; border-radius: 4px; border: 1px solid rgba(96, 165, 250, 0.3);
  margin-left: 8px;  
}
.time-tabs { 
  display: flex; 
  background: rgba(15, 23, 42, 0.6); 
  padding: 2px; 
  border-radius: 6px; 
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.time-tabs button { 
  padding: 3px 12px; 
  font-size: 11px; 
  border: none; 
  background: transparent; 
  cursor: pointer; 
  color: #94a3b8;
  transition: all 0.3s ease;
}

.time-tabs button.active { 
  background: #3b82f6; 
  color: #fff; 
  border-radius: 4px; 
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

/* 日期选择工具栏：居中且通透 */
.date-selector-bar { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  gap: 12px; 
  margin-bottom: 8px;
  flex-shrink: 0;
}

.nav-arrow { 
  background: transparent; 
  border: none; 
  color: #3b82f6; 
  cursor: pointer; 
  font-size: 14px; 
  padding: 4px;
  transition: transform 0.2s;
}
.nav-arrow:hover { transform: scale(1.2); color: #60a5fa; }

/* 日期文字：移除白色背景，改为发光边框 */
.date-picker-wrapper { 
  position: relative; 
  cursor: pointer; 
  z-index: 50;
}
.current-date-text { 
  font-size: 12px; 
  font-weight: 600; 
  color: #fff; 
  background: rgba(30, 41, 59, 0.5); 
  padding: 4px 16px; 
  border-radius: 4px; 
  border: 1px solid rgba(59, 130, 246, 0.4); 
  backdrop-filter: blur(4px);
}
.hidden-date-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; }

/* 关键：chart-box 用 flex:1 + min-height:0 自适应剩余高度 */
.chart-box { 
  flex: 1; 
  width: 100%; 
  min-height: 0;
}

.peak-tag {
  font-size: 11px;
  text-align: center;
  color: #94a3b8;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
  flex-shrink: 0;
}

.peak-icon { margin-right: 4px; }

.highlight { 
  color: #f87171; /* 柔和的警示红 */
  font-weight: bold; 
  margin: 0 4px;
  text-shadow: 0 0 5px rgba(248, 113, 113, 0.3);
}
</style>