<template>
  <div class="map-wrap">
    <div id="map-container" class="standard-map"></div>

    <transition name="fade">
      <div v-if="heatmap" class="heatmap-legend">
        <div class="legend-title">需求热度说明</div>
        <div class="gradient-bar"></div>
        <div class="legend-labels">
          <span>低 (稀疏)</span>
          <span>中 (繁忙)</span>
          <span>高 (饱和)</span>
        </div>
        <div class="legend-desc">
          <span class="dot red"></span> 红色区域需紧急调度
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch,nextTick } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';


const props = defineProps({
  services: { type: Array, default: () => [] },
  heatmap: { type: Boolean, default: false },
  trailingData: { type: Array, default: () => [] }  // 4D 拖尾数据 [{lng, lat, opacity, raw}, ...]
});

const emit = defineEmits(['marker-click']);

let map = null;
let heatmapInstance = null;
let markers = [];
let massMarks = null;  // 4D 海量点图层

// 安全密钥配置
window._AMapSecurityConfig = { securityJsCode: '158271bb9de2653a0ff710b76a77a458' };

async function initMap() {
  try {
    const AMap = await AMapLoader.load({
      key: '3b1255de527dd6a6af98dd5bdd4970dd',
      version: '2.0',
      plugins: ['AMap.HeatMap', 'AMap.MassMarks']
    });

    map = new AMap.Map('map-container', {
      zoom: 12,
      center: [115.892151, 28.676493],
      mapStyle: 'amap://styles/dark',              // 暗色底图
      features: ['bg', 'road', 'building'],        // 只显示背景/道路/建筑，去掉POI文字噪音
      viewMode: '2D',
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: true,
    });

    // 初始化热力图：参数调优以适配白底地图
    heatmapInstance = new AMap.HeatMap(map, {
      radius: 50, // 半径调大，连接成片
      opacity: [0, 0.85],
      gradient: {
        0.2: 'rgb(0, 0, 255)',   // 蓝
        0.5: 'rgb(0, 255, 0)',   // 绿
        0.7: 'rgb(255, 255, 0)', // 黄
        1.0: 'rgb(255, 0, 0)'    // 红
      }
    });

    // 4D 海量点图层：3 档样式对应 3 级拖尾透明度
    try {
      massMarks = new AMap.MassMarks([], {
        zIndex: 111,
        cursor: 'pointer'
      });
      massMarks.setStyle([
        { anchor: new AMap.Pixel(6, 6),  size: new AMap.Size(14, 14), fillColor: '#38bdf8', fillOpacity: 1.0, strokeColor: 'rgba(255,255,255,0.9)', strokeWeight: 2, zIndex: 200 },
        { anchor: new AMap.Pixel(5, 5),  size: new AMap.Size(10, 10), fillColor: '#38bdf8', fillOpacity: 0.5, strokeColor: 'rgba(255,255,255,0.5)', strokeWeight: 1, zIndex: 150 },
        { anchor: new AMap.Pixel(4, 4),  size: new AMap.Size(7, 7),   fillColor: '#38bdf8', fillOpacity: 0.2, strokeColor: 'rgba(255,255,255,0.2)', strokeWeight: 0, zIndex: 100 }
      ]);
      massMarks.setMap(map);
      massMarks.on('click', (e) => {
        if (e.data && e.data.raw) {
          emit('marker-click', e.data.raw);
        }
      });
    } catch (e) {
      console.warn('MassMarks 初始化失败，将使用 DOM Marker 模式:', e);
      massMarks = null;
    }

    updateDisplay();
  } catch (e) {
    console.error('地图加载失败:', e);
  }
}

/**
 * 执行地图显示更新
 * 核心逻辑：数据清洗 -> 热力图数据同步 -> 根据开关控制 Marker/热力图层显隐
 */
function updateDisplay() {
  console.log("地图接收到的原始数据量:", props.services.length);
  if (!map) return;

  // 1. 彻底清理旧标记（防止 Marker 叠加导致地图变卡）
  if (markers.length > 0) {
    map.remove(markers); 
    markers = [];
  }

  // 2. 转换坐标并确保是数字类型
  const validPoints = props.services.map(s => {
    // 自动兼容后端可能返回的各种字段名
    const lng = parseFloat(s.rLng || s.r_lng || s.rlng || 0);
    const lat = parseFloat(s.rLat || s.r_lat || s.rlat || 0);
    return {
      lng: lng,
      lat: lat,
      count: 1,
      raw: s 
    };
  }).filter(p => p.lng > 0 && p.lat > 0);

  console.log("最终有效坐标点数量:", validPoints.length);

  // 3. 热力图/点位模式切换
  if (props.heatmap) {
    if (heatmapInstance) {
      heatmapInstance.setDataSet({
        data: validPoints,
        max: 5
      });
      heatmapInstance.show();
    }
  } else {
    // 普通点位模式
    if (heatmapInstance) heatmapInstance.hide();
    renderMarkers(validPoints);
  }
}

/**
 * 内部辅助函数：渲染点位标记
 */
function renderMarkers(points) {
  points.forEach(p => {
    const marker = new window.AMap.Marker({
      position: [p.lng, p.lat],
      // 样式在 <style> 标签中的 .map-dot 定义
      content: '<div class="map-dot"></div>', 
      // 动画效果：点位从上方落下，增加动态感
      animation: 'AMAP_ANIMATION_DROP',
      offset: new window.AMap.Pixel(-6, -6) // 居中偏移
    });

    // 点击事件分发：将原始数据传回父组件 BigScreen.vue
    marker.on('click', () => {
      emit('marker-click', p.raw);
    });

    markers.push(marker);
  });
  
  // 批量添加到地图，性能更优
  map.add(markers);
}

/**
 * 4D 拖尾渲染：MassMarks WebGL 批量更新
 */
function updateMassMarks(data) {
  if (!massMarks || !map) return;
  if (!data || data.length === 0) {
    massMarks.clear();
    return;
  }
  const styledData = data.map(pt => ({
    lnglat: [pt.lng, pt.lat],
    style: pt.opacity <= 0.2 ? 2 : pt.opacity <= 0.5 ? 1 : 0,
    raw: pt.raw
  }));
  massMarks.setData(styledData);
}

watch(() => props.services, updateDisplay, { deep: true });
watch(() => props.heatmap, updateDisplay);
watch(() => props.trailingData, (newData) => {
  if (newData && newData.length > 0) {
    // 4D 播放模式：使用 MassMarks
    if (heatmapInstance) heatmapInstance.hide();
    // 清理旧 DOM markers
    if (markers.length > 0) { map?.remove(markers); markers = []; }
    updateMassMarks(newData);
  } else {
    // 非播放模式：回退到原有逻辑
    massMarks?.clear();
    updateDisplay();
  }
});

onMounted(async () => {
  await nextTick();
  setTimeout(() => {
    initMap();
  }, 100);
});
onBeforeUnmount(() => map?.destroy());
</script>

<style scoped>
/* 地图容器样式 */
.map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.standard-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

/* 地图上的点标记样式 */
:deep(.map-dot) {
  width: 10px; height: 10px;
  background: #38bdf8;
  border: 2px solid rgba(255,255,255,0.9);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(56,189,248,0.6), 0 0 2px rgba(56,189,248,0.8);
  cursor: pointer;
  animation: dot-pulse 3s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(56,189,248,0.4), 0 0 2px rgba(56,189,248,0.6); }
  50% { box-shadow: 0 0 14px rgba(56,189,248,0.8), 0 0 4px rgba(56,189,248,1); }
}

/* 悬浮图例样式 */
.heatmap-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  width: 160px;
  font-family: sans-serif;
}

.legend-title {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.gradient-bar {
  height: 10px;
  background: linear-gradient(to right, blue, green, yellow, red);
  border-radius: 5px;
  margin-bottom: 4px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
  margin-bottom: 8px;
}

.legend-desc {
  font-size: 11px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot.red {
  width: 8px;
  height: 8px;
  background: red;
  border-radius: 50%;
  display: inline-block;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>