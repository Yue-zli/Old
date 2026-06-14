// useDashboardState.js — BigScreen 全部状态 + 数据获取 + 交互方法
import { watch,ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '../api/stat.js';
import { mockManagers, mockVolunteers } from '../data/mockUsers.js';
import { usePlayback } from './usePlayback.js';
import { useSpacetimePreprocess } from './useSpacetimePreprocess.js';
import { useSpacetimePlayer } from './useSpacetimePlayer.js';
export function useDashboardState() {
  const router = useRouter();

  // ===== 1. 模式切换 =====
  const currentMode = ref('demand');
  const modeTitle = computed(() => {
    if (currentMode.value === 'demand') return '实时服务轨迹与热力分布';
    if (currentMode.value === 'evaluation') return '15分钟生活圈评价分析';
    return '适老化路径规划';
  });
  const modeIcon = computed(() => {
    if (currentMode.value === 'demand') return '🔥';
    if (currentMode.value === 'evaluation') return '🌐';
    return '🚀';
  });

  // ===== 2. 核心数据 =====
  const orders = ref([]);
  const managers = ref([...mockManagers]);
  const volunteers = ref([...mockVolunteers]);
  const heatmap = ref(false);
  const svcMap = { 0: '基础照护', 1: '陪护服务', 2: '送餐服务', 3: '清洁服务', 4: '心理疏导' };

  // ===== 3. 详情弹窗 =====
  const detailItem = ref({});
  const detailVisible = ref(false);

  // ===== 4. 图表数据 =====
  const ageData = ref([]);
  const genderData = ref([]);
  const typeData = ref([]);
  const peakInfo = ref({ time: '', value: 0 });
  const ageChart = ref(null);
  const genderChart = ref(null);
  const typeChart = ref(null);
  const trendChart = ref(null);

  // ===== 5. 日期 & 趋势 =====
  const selectedDate = ref(new Date('2025-01-21 00:00:00'));
  const currentScale = ref('day');
  const playbackScale = ref('day');
  const scaleMap = { day: '日', week: '周', month: '月' };

  const selectedDateStr = computed(() => {
    const d = selectedDate.value;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const totalStats = computed(() => ({
    total: orders.value.length,
    label: '订单总量'
  }));

  // ===== 6a. 播放逻辑（集成 usePlayback） =====
  const {
    displayOrders, isPlaying, playProgress, currentTimeDisplay,
    timeAxisTicks, startMapPlayback, stopPlayback, initDisplayOrders, seekToPercent
  } = usePlayback(orders, heatmap, playbackScale, selectedDate);
  
  // ===== 6b.时空漫游引擎
  const playbackSpeedMs = ref(800);
  const {
    bucketMap, timeAxisKeys, orderCountPerBucket,
    rawOrders, isLoading: isSpacetimeLoading, error: spacetimeError,
    fetchAndPreprocess, recomputeBuckets
  } = useSpacetimePreprocess();

  const {
    isPlaying: spacetimeIsPlaying, currentIndex, currentTimeLabel,
    trailingData, playProgress: spacetimePlayProgress,
    play, pause, stop: spacetimeStop, seek, setSpeed
  } = useSpacetimePlayer(bucketMap, timeAxisKeys, playbackSpeedMs);

  // ===== 7. 交互方法 =====
  function handleModeSwitch(mode) {
    currentMode.value = mode;
    if (mode === 'evaluation') stopPlayback();
    else if (mode === 'demand') initDisplayOrders();
  }

  function openDetail(item) {
    detailItem.value = item;
    detailVisible.value = true;
  }

  function toggleHeatmap() { heatmap.value = !heatmap.value; }

  function formatTime(t) {
    if (!t) return '无';
    return new Date(t).toLocaleString();
  }

  function goAnalysis() { router.push('/analysis'); }
  function goCoverage() { router.push('/coverage'); }
  function goList() { router.push('/requesters'); }

  // 4D 播放时间标签：月维度时显示月份而非日期
  const spacetimeTimeLabel = computed(() => {
    const label = currentTimeLabel.value;
    if (playbackScale.value !== 'month' || !label) return label;
    const m = label.split('/')[0];
    return m + '月';
  });

  //4D时空漫游： 切换维度换单位
  function handlePlaybackScaleChange(scale) {
    spacetimeStop();
    playbackScale.value = scale;
    recomputeBuckets(scale, selectedDate.value);
  }

  //首次加载后做初始分桶
  function initSpacetimeBuckets() {
    recomputeBuckets(playbackScale.value, selectedDate.value);
    currentIndex.value=0;
  }

  watch(selectedDate ,(newDate)=>{
    recomputeBuckets(playbackScale.value, newDate);
    currentIndex.value=0;
  })

  // ===== 8. 数据获取 =====
  async function fetchAll() {
    try {
      await fetchAndPreprocess();
      initSpacetimeBuckets();
      const list = rawOrders.value;
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
      try { ageData.value = await api.statElderlyAge(60, 70, 80); } catch (e) { console.error('年龄统计失败:', e); }
      try { genderData.value = await api.statElderlyGender(); } catch (e) { console.error('性别统计失败:', e); }
      try { typeData.value = await api.statServiceType(); } catch (e) { console.error('服务类型统计失败:', e); }
    } catch (e) {
      console.error('订单数据加载失败:', e);
    }
  }

  // ===== 9. 图表 resize =====
  function handleResize() {
    ageChart.value?.resize?.();
    genderChart.value?.resize?.();
    typeChart.value?.resize?.();
    trendChart.value?.resize?.();
  }

  // ===== 10. 生命周期 =====
  onMounted(() => {
    fetchAll();
    window.addEventListener('resize', handleResize);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  // ===== 导出 =====
  return {
    currentMode, modeTitle, modeIcon, handleModeSwitch,
    orders, managers, volunteers, heatmap, svcMap,
    totalStats, selectedDateStr,
    detailItem, detailVisible, openDetail,
    ageData, genderData, typeData, peakInfo,
    ageChart, genderChart, typeChart, trendChart,
    currentScale, selectedDate, playbackScale, scaleMap,
    displayOrders, isPlaying, playProgress, currentTimeDisplay,
    timeAxisTicks, startMapPlayback, stopPlayback, seekToPercent, initDisplayOrders,
    toggleHeatmap, formatTime, goAnalysis, goCoverage, goList,
    fetchAll,
    // ===4D时空漫游导出
    timeAxisKeys, orderCountPerBucket, currentIndex,
    currentTimeLabel: spacetimeTimeLabel,
    trailingData,
    spacetimeIsPlaying, spacetimePlay:play, spacetimePause: pause, spacetimeStop,
    spacetimePlayProgress,
    seek, handlePlaybackScaleChange
  };
}
