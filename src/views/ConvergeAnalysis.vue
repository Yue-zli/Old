<template>
  <div class="analysis-page">
    <header class="analysis-header">
      <div class="header-left">
        <span class="platform-title">养老资源时空分析决策平台</span>
      </div>
      <div class="header-right">
        <router-link to="/dashboard" class="nav-btn">← 返回监控大屏</router-link>
      </div>
    </header>

    <div class="content-body">
      <aside class="control-panel">
        <h2 class="panel-main-title">空间决策控制台</h2>
        <div class="platform-intro">
          本平台提供<strong>【15分钟医疗覆盖诊断】</strong>与<strong>【适老化设施选址推演】</strong>双模态决策支持
        </div>

        <div class="module-section">
          <h3 class="module-title">模块A: 医疗资源覆盖现状</h3>
          <div class="stat-card">
            <div class="stat-label">当前南昌市基础医疗服务覆盖率</div>
            <div class="stat-value">
              {{ coverageRate }}<small>%</small>
              <span v-if="showDeltaBadge" class="delta-badge">▲ 选址效益提升 +{{ coverageDelta }}%</span>
            </div>
            <div class="stat-bar">
              <div class="bar-inner" :style="{ width: coverageRate + '%' }"></div>
              <p class="expert-advice" :class="{ 'warning': coverageRate <= 60}">
                {{ coverageRate > 60 ? '🟢 基础医疗资源配置较均衡' : '🟠 存在明显服务盲区，需优先规划' }}
              </p>
            </div>
          </div>
        </div>

        <div class="module-section">
          <h3 class="module-title">模块B：适老设施选址推演</h3>
          <div class="scenario-context">
            <p><strong>💡 权重推演指南：</strong>调节下方环境因子权重，系统将重算建设用地的优劣势评分。</p>
          </div>

          <div class="preset-group" v-if="showEvaluationMode">
            <button class="preset-btn" @click="applyPreset(1.5, 0.5, 1.5)">🌿 康养疗愈型</button>
            <button class="preset-btn" @click="applyPreset(0.5, 2.0, 1.0)">🏃 活力出行型</button>
            <button class="preset-btn" @click="applyPreset(1.0, 1.0, 3.0)">🛡️ 严格避险型</button>
          </div>

          <div class="param-setting-box">
            <div class="param-item">
              <div class="param-label"><span>🌳 生态疗愈 (公园) 增益</span><span class="param-val">x {{ weightPark }}</span></div>
              <input type="range" min="0" max="3" step="0.5" v-model.number="weightPark" @change="startAnalysis" class="custom-slider" :disabled="!showEvaluationMode"/>
            </div>
            <div class="param-item">
              <div class="param-label"><span>🚇 适老出行 (交通) 增益</span><span class="param-val">x {{ weightTransit }}</span></div>
              <input type="range" min="0" max="3" step="0.5" v-model.number="weightTransit" @change="startAnalysis" class="custom-slider" :disabled="!showEvaluationMode"/>
            </div>
            <div class="param-item">
              <div class="param-label"><span>⚠️ 环境风险 (邻避) 惩罚</span><span class="param-val">x {{ weightNimby }}</span></div>
              <input type="range" min="0.5" max="5" step="0.5" v-model.number="weightNimby" @change="startAnalysis" class="custom-slider" :disabled="!showEvaluationMode"/>
            </div>
          </div>
        </div>

        <div class="module-section filter-section" v-if="showEvaluationMode">
          <h3 class="module-title">🔍 一键选址分级查询</h3>
          <div class="grade-filter-group">
            <button class="filter-btn" :class="{'active-all': activeGradeFilter === 'ALL'}" @click="setGradeFilter('ALL')">全域统揽</button>
            <button class="filter-btn" :class="{'active-a': activeGradeFilter === 'A'}" @click="setGradeFilter('A')">A级优选</button>
            <button class="filter-btn" :class="{'active-b': activeGradeFilter === 'B'}" @click="setGradeFilter('B')">B级备选</button>
            <button class="filter-btn" :class="{'active-c': activeGradeFilter === 'C'}" @click="setGradeFilter('C')">C级规避</button>
          </div>
        </div>

        <button class="action-btn eval-btn" :class="{'btn-active': showEvaluationMode}" @click="toggleEvaluationMode">
           {{ showEvaluationMode ? '🚫 退出选址评估模式'  : '📊 启动全域选址推演 (智能高亮)' }}
        </button>
      </aside>

      <section class="map-section" id="analysis-map">
        <div class="view-label">
          <div class="theme-badge">{{ currentTheme }}</div>
          <div class="zoom-info">
            诊断范围：{{ (searchRadius * 15).toFixed(1) }} km² | 比例尺：{{ zoomLevelText }}
          </div>
        </div>     

        <div class="map-toolbar-overlay">
          <button class="toolbar-tile" :class="{ 'active-tile': layerVisibility.grid }" @click="toggleLayer('grid')">
            <span class="tile-icon">⬡</span><span class="tile-text">网格</span>
          </button>
          <button class="toolbar-tile" :class="{ 'active-tile' : layerVisibility.facilities }" @click="toggleLayer('facilities')">
            <span class="tile-icon">🏥</span><span class="tile-text">设施</span>
          </button>
          <button class="toolbar-tile" @click="startDraw" title="圈选特定区域进行局部推演">
            <span class="tile-icon">📐</span><span class="tile-text">区域圈选</span>
          </button>
          <button class="toolbar-tile sim-tile" :class="{ 'simulating-active': isSimulating }" @click="startSimulation">
            <span class="tile-icon">{{ isSimulating ? '🎯' : '➕' }}</span>
            <span class="tile-text">{{ isSimulating ? '请点击盲区...' : '选址模拟' }}</span>
          </button>
          <button class="toolbar-undo-tile" @click="undoLastAction" :disabled="addedMarkers.length === 0"
            :style="{ opacity: addedMarkers.length === 0 ? 0 : 1, pointerEvents: addedMarkers.length === 0 ? 'none' : 'auto' }" title="撤销上一步选址">
            ↩
          </button>
        </div>

        <div class="map-legend-overlay">
          <div class="legend-title">{{ showEvaluationMode ? '选址综合评分 (分级透视)' : '医疗资源密度' }}</div>
          <div class="legend-bars" v-if="!showEvaluationMode">
            <span><div class="bar bar-low"></div> 稀缺</span>
            <span><div class="bar bar-mid"></div> 覆盖</span>
            <span><div class="bar bar-high"></div> 充沛</span>
          </div>
          <div class="legend-bars" v-else>
            <span><div class="bar" style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444;"></div> C级高危</span>
            <span><div class="bar" style="background: rgba(245, 158, 11, 0.2); border: 2px solid #f59e0b;"></div> B级备选</span>
            <span><div class="bar" style="background: rgba(34, 211, 238, 0.2); border: 2px solid #22d3ee;"></div> A级优选</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as turf from '@turf/turf';
import facilityData from '../data/facilities.json';
import parkData from '../data/nanchang_parks.json';
import transitData from '../data/nanchang_transit.json';
import nimbyData from '../data/nanchang_nimby.json';

// --- 状态变量 ---
const showEvaluationMode = ref(false);
const weightPark = ref(1.0);
const weightTransit = ref(1.0);
const weightNimby = ref(2.0);
const activeGradeFilter = ref('ALL'); // 新增：网格分级筛选器状态

const parkFeatures = parkData;
const transitFeatures = transitData;
const nimbyFeatures = nimbyData;

const addedMarkers = ref([]);
let mouseTool = null;
const isSimulating = ref(false);
const coverageDelta = ref(0);
const showDeltaBadge = ref(false);

const totalGridCount = ref(0);
const coverageRate = ref(0);
const searchRadius = ref(0.8);
const richThreshold = ref(3);
const zoomLevelText = ref('城市级');
const currentTheme = ref('城市宏观态势');

// --- 一键预设权重 ---
const applyPreset = (park, transit, nimby) => {
  weightPark.value = park;
  weightTransit.value = transit;
  weightNimby.value = nimby;
  startAnalysis(); // 动态触发重绘
};

// --- 一键分级筛选 ---
const setGradeFilter = (grade) => {
  activeGradeFilter.value = grade;
  startAnalysis(); // 触发过滤重绘
};

const toggleEvaluationMode = () => {
  showEvaluationMode.value = !showEvaluationMode.value;
  if (showEvaluationMode.value && !layerVisibility.value.grid) {
    toggleLayer('grid');
  }
  if (!showEvaluationMode.value) {
    activeGradeFilter.value = 'ALL'; // 退出模式时重置筛选
  }
  startAnalysis();
}

const layerVisibility = ref({ grid: true, facilities: true, parks: true, transits: true, nimbys: true });

const toggleLayer = (layerType) => {
  layerVisibility.value[layerType] = !layerVisibility.value[layerType];
  const isVisible = layerVisibility.value[layerType];

  if (layerType === 'grid' && map) {
    map.getAllOverlays('polygon').forEach(p => {
      if (p.getOptions().zIndex === 10) isVisible ? p.show() : p.hide();
    });
  } else if (layerType === 'facilities') {
    [...parkMarkers, ...transitMarkers, ...nimbyMarkers].forEach(layer => {
      isVisible ? layer.show() : layer.hide();
    });
  }
};

const handleZoomTheme = (zoom) => {
  if (zoom < 11) currentTheme.value = '城市宏观态势';
  else if (zoom >= 11 && zoom <= 14) currentTheme.value = '区域协同诊断';
  else currentTheme.value = '社区精准选址';

  const shouldShowNimby = zoom >= 13.5 && layerVisibility.value.facilities;
  nimbyMarkers.forEach(m => shouldShowNimby ? m.show() : m.hide());
  const shouldShowBasic = zoom >= 12.5 && layerVisibility.value.facilities;
  parkMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
  transitMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
};

let map = null;
let parkMarkers = [];
let transitMarkers = [];
let nimbyMarkers = [];
let infoWindow = null; 

onMounted(() => {
  const initMap = () => {
    if (typeof AMap !== 'undefined') {
      map = new AMap.Map('analysis-map', {
        zoom: 13, center: [115.89, 28.69], mapStyle: 'amap://styles/dark', viewMode: '3D', pitch: '40', features: ['bg', 'point', 'road','building']
      });

      map.on('zoomchange', () => handleZoomTheme(map.getZoom()));

      const district = new AMap.DistrictLayer.Province({
        zIndex: 10, adcode: '360100', depth: 1,
        styles: { 'stroke-width': 2, 'stroke': '#ffffff', 'fill': 'rgba(255, 255, 255, 0.03)' }
      });
      map.add(district);
      
      const labelsLayer = new AMap.LabelsLayer({ zIndex: 110, collision: true });
      map.add(labelsLayer);
      
      AMap.plugin(['AMap.MouseTool'], ()=> {
        mouseTool = new AMap.MouseTool(map);
        mouseTool.on('draw', (e)=> {
          const bounds = e.obj.getBounds();
          const bbox = [bounds.southWest.lng, bounds.southWest.lat, bounds.northEast.lng, bounds.northEast.lat];
          recalculateAnalysis(bbox);
          mouseTool.close();
        });
      });
      
      infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -10), closeWhenClickMap: true });
      map.on('complete', () => {
        startAnalysis();
        renderEnvironmentLayers();
      });
    } else {
      setTimeout(initMap, 200);
    }
  };
  initMap();
});

const executeAnalysis = (bbox) => {
  if (map) {
    map.getAllOverlays('polygon').forEach(o => {
      if (o.getOptions().zIndex === 10) map.remove(o);
    });
  }
  if (infoWindow) infoWindow.close();

  const gridCellSize = 0.8;
  const squareGrid = turf.squareGrid(bbox, gridCellSize, {units: 'kilometers'});
  
  const getCountInRange = (geoJsonData, centerPt, radiusKm) => {
    if(!geoJsonData || !geoJsonData.features || !Array.isArray(geoJsonData.features)) return { count: 0, minDist: 999};
    let count = 0; let minDist = 999;
    geoJsonData.features.forEach(f => {
      try {
        const dist = turf.distance(centerPt, f, { units: 'kilometers'});
        if(dist < minDist) minDist = dist;
        if(dist <= radiusKm) count++;
      } catch (err) {}
    });
    return {count, minDist};
  }

  const points = turf.featureCollection(facilityData.map((d, i) => {
    return turf.point([d.lng, d.lat], { name: d.name, type: i < 5 ? '三甲医院' : '社区卫生服务中心' });
  }));

  const turfPoints = turf.featureCollection(facilityData.map(d => turf.point([d.lng, d.lat])));
  let coveredCells = 0; let validGridCount = 0;
  
  const exclusionZones = {
    rivers: turf.buffer(turf.lineString([[115.959, 28.783], [115.932, 28.769], [115.896, 28.750], [115.893, 28.728], [115.910, 28.780]]), 0.55, { units: 'kilometers'}),
    lakes: turf.multiPolygon([[[[115.990, 28.660], [116.030, 28.660], [116.030, 28.720], [115.990, 28.720], [115.990, 28.660]]]]),
    mountains: turf.polygon([[[115.600, 28.740], [115.730, 28.740], [115.760, 28.780], [115.750, 28.880], [115.600, 28.880], [115.600, 28.740]]])
  };

  squareGrid.features.forEach((cell) => {
    const currentCenterPt = turf.center(cell);
    const [lng, lat] = currentCenterPt.geometry.coordinates;
    const isExcluded = turf.booleanPointInPolygon(currentCenterPt, exclusionZones.rivers) || turf.booleanPointInPolygon(currentCenterPt, exclusionZones.lakes) || turf.booleanPointInPolygon(currentCenterPt, exclusionZones.mountains);
    if (isExcluded) return;

    validGridCount++;
    const ptsInGrid = turf.pointsWithinPolygon(points, cell);
    const medicalCount = ptsInGrid.features.length;
    cell.properties.count = medicalCount;
    if (medicalCount > 0) coveredCells++;

    const pd = getCountInRange(parkFeatures, currentCenterPt, 0.8);
    const td = getCountInRange(transitFeatures, currentCenterPt, 0.8);
    const nd = getCountInRange(nimbyFeatures, currentCenterPt, 1.0);
    
    let score = 65 + Math.min(30, (pd.count || 0) * 4 * weightPark.value) + Math.min(30, (td.count || 0) * 5 * weightTransit.value) - ((nd.count || 0) * 15 * weightNimby.value);
    if (ptsInGrid.features.some(f => f.properties.name.includes('拟建'))) score += 15;
    if (nd.minDist < 0.2) score -= 40 * weightNimby.value;
    score = Math.max(0, Math.min(100, Math.floor(score)));

    // 🚀 过滤逻辑：根据用户点击的按钮进行分级过滤拦截
    if (showEvaluationMode.value && activeGradeFilter.value !== 'ALL') {
      if (activeGradeFilter.value === 'A' && score < 80) return;
      if (activeGradeFilter.value === 'B' && (score >= 80 || score < 60)) return;
      if (activeGradeFilter.value === 'C' && score >= 60) return;
    }

    // 绘制逻辑
    let fillColor = medicalCount >= richThreshold.value ? '#10b981' : (medicalCount >= 1 ? '#f59e0b' : '#334155');
    let strokeColor = 'rgba(255,255,255,0.15)';
    let strokeWeight = 0.8;
    // 🐞 修复点：提取基础透明度常量，防止 mouseout 中出现 ReferenceError
    const baseFillOpacity = medicalCount > 0 ? 0.12 : 0.02;

    if (showEvaluationMode.value) {
      if (score >= 80) { strokeColor = '#22d3ee'; strokeWeight = 2.5; fillColor = '#22d3ee'; } 
      else if (score >= 60) { strokeColor = '#f59e0b'; strokeWeight = 2.5; fillColor = '#f59e0b'; } 
      else { strokeColor = '#ef4444'; strokeWeight = 2.5; fillColor = '#ef4444'; } 
    }
    
    const polygon = new AMap.Polygon({
      path: cell.geometry.coordinates[0], 
      fillColor: fillColor, 
      fillOpacity: showEvaluationMode.value ? 0.15 : baseFillOpacity, // 评估模式下加强色彩感
      strokeWeight: strokeWeight, strokeColor: strokeColor,
      map: map, zIndex: 10, bubble: true
    });

    polygon.on('mouseover', (e) => {
      polygon.setOptions({ fillOpacity: 0.4, strokeColor: '#fff', strokeWeight: 2 });
      let popupContent = '';
      
      if (showEvaluationMode.value) {
        let parkDesc = pd.count > 0 ? `<span style="color:#10b981;">优 (${pd.count}处)</span>` : `<span style="color:#94a3b8;">缺</span>`;
        let transitDesc = td.count > 0 ? `<span style="color:#38bdf8;">佳 (${td.count}处)</span>` : `<span style="color:#f59e0b;">弱</span>`;
        let nimbyDesc = nd.count > 0 ? `<span style="color:#ef4444;">警报(距${(nd.minDist * 1000).toFixed(0)}m)</span>` : `<span style="color:#10b981;">安全</span>`;
        const advice = score >= 80 ? '<div style="color: #22d3ee; background: rgba(34,211,238,0.1); padding:6px; border-radius:4px;">🔥 A级优选：极度适宜建设</div>' 
                     : (score >= 60 ? '<div style="color: #f59e0b; background: rgba(245,158,11,0.1); padding:6px; border-radius:4px;">⚠️ B级备选：需增设隔音/绿化</div>'
                                : '<div style="color: #ef4444; background: rgba(239,68,68,0.1); padding:6px; border-radius:4px;">🛑 C级高危：环境风险过高</div>');
        popupContent=` 
          <div class="custom-info-window" style="min-width: 300px;">
            <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid rgba(59,130,246,0.3); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between;">
              <span>🎯 选址综合诊断评估</span><span style="color: ${score >= 80 ? '#22d3ee' : (score >= 60 ? '#f59e0b' : '#ef4444')}; font-size: 16px;">${score} 分</span>
            </div>
            <div style="font-size: 12px; line-height: 1.8; margin-bottom: 10px;">
                <div><strong>🏥 现状医疗：</strong>${medicalCount > 0 ? `<span style="color:#10b981;">已覆盖 (${medicalCount}处)</span>` : '盲区'}</div>
                <div><strong>🌳 生态环境：</strong>${parkDesc}</div>
                <div><strong>🚇 交通节点：</strong>${transitDesc}</div>
                <div><strong>⚠️ 邻避风险：</strong>${nimbyDesc}</div>
            </div>
            ${advice}
          </div>`;
      } else {
        if (medicalCount > 0) {
           const names = ptsInGrid.features.map(f => `<li style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">📍 ${f.properties.name || '未知设施'}</li>`).join('');
           popupContent = `
            <div class="custom-info-window" style="min-width: 220px;">
              <div class="window-header">🏥 医疗覆盖精细化评估</div>
              <div class="window-body">
                <p style="margin: 0 0 8px 0; color: #10b981;">已覆盖设施：${medicalCount} 处</p>
                <ul style="max-height: 150px; overflow-y: auto;">${names}</ul>
              </div>
            </div>`;
        } else {
           popupContent = `<div class="custom-info-window" style="padding: 8px 12px; color: #f87171;">⚠️ 医疗服务盲区</div>`;
        }
      }
      infoWindow.setContent(popupContent);
      // 🐞 修复点：规避部分 e.lnglat 丢失风险，使用中心点计算坐标绝对安全
      infoWindow.open(map, [lng, lat]);
    });

    polygon.on('mouseout', ()=> {
      // 🐞 修复点：调用上面存好的闭包变量 baseFillOpacity 
      polygon.setOptions({ fillOpacity: showEvaluationMode.value ? 0.15 : baseFillOpacity, strokeWeight: strokeWeight, strokeColor: strokeColor });
      infoWindow.close();
    });
  });

  coverageRate.value = validGridCount > 0 ? ((coveredCells / validGridCount * 100).toFixed(1)) : 0;
};

const startAnalysis = () => {
  const defaultBbox = [115.75, 28.55, 116.05, 28.80];
  executeAnalysis(defaultBbox);
};

const renderFacilityPoints = () => {
  facilityData.forEach(item => {
    map.add(new AMap.CircleMarker({ center: [item.lng, item.lat], radius: 4, fillColor: '#ffffff', strokeColor: '#00ffff', zIndex: 99 }));
  });
};

const startDraw = () => {
  if(mouseTool) {
    map.setPitch(0);
    alert("请在地图上按住鼠标左键，框选你需要分析的区域");
    mouseTool.rectangle({
      strokeColor: '#60a5fa',
      fillColor: '#60a5fa',
      fillOpacity: 0.15,
      strokeWeight: 1.5
    });
  }
};

const recalculateAnalysis = (newBbox) => {
  executeAnalysis(newBbox);
};

const startSimulation = () => {
  if(!map) return;
  isSimulating.value = true;
  map.setDefaultCursor('crosshair');
  map.on('click', handlerMapClick);
};

const handlerMapClick = (e) => {
  if(!isSimulating.value) return;
  const {lng, lat } = e.lnglat;
  const marker = new AMap.Marker({
    position: [lng, lat],
    content: '<div class="radar-dot"></div>', // 你的雷达点样式
    offset: new AMap.Pixel(-10, -10)
  });
  marker.setMap(map);
  addedMarkers.value.push(marker);

  const oldCoverage = parseFloat(coverageRate.value);
  facilityData.push({
    lng:lng,
    lat:lat,
    name:`拟建社区养老卫生站_${facilityData.length - 40}`
  });
  startAnalysis();

  setTimeout(() => {
    const newCoverage = parseFloat(coverageRate.value);
    const delta = (newCoverage -oldCoverage).toFixed(1);
    if(delta>0) {
      coverageDelta.value = delta;
      showDeltaBadge.value = true;
      setTimeout(() => {
        showDeltaBadge.value = false;
      }, 4000);
    }
  }, 200);

  isSimulating.value = false;
  map.setDefaultCursor('pointer');
  map.off('click', handlerMapClick);
}

const undoLastAction = () => {
  if (addedMarkers.value.length === 0 ) {
    alert("当前没有可撤销的地址");
    return;
  }
  const lastMarker = addedMarkers.value.pop();
  map.remove(lastMarker);
  facilityData.pop();
  startAnalysis();
}

const renderEnvironmentLayers = () => {
  if (!map) return;
  
  // ⚡【核心优化】：如果 markers 已经存在，说明这是 startAnalysis() 触发的网格重绘。
  // 我们直接退出函数，绝对不重复创建 Marker，这样能完美保持用户点击右上角开关的隐藏/显示状态。
  if (parkMarkers.length > 0 || transitMarkers.length > 0 || nimbyMarkers.length > 0) {
    return;
  }

  // 🌳 1. 渲染 公园设施气泡 (生态疗愈)
  if (parkFeatures && parkFeatures.features) {
    parkFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: `<div class="poi-marker poi-park" title="${item.properties.name || ''}">🌳</div>`,
        offset: new AMap.Pixel(-10, -10),
        zIndex: 90
      });
      marker.setMap(map);
      parkMarkers.push(marker); // 正确挂载到全局数组
    });
  }

  // 🚇 2. 渲染 地铁站点凸包面与线
// 🚇 2. 【重构】地铁站点精细化视觉标识（中心标 + 出口微点 + 连通 footprint）
  if (transitFeatures && transitFeatures.features) {
    const stationGroups = {};
    
    // 2.1 重新聚合数据，确保名称清洗干净并附带真实出口
    transitFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates; 
      const rawName = item.properties.name || "";
      // 正则清洗：将 "八一广场站(1号口)" 或 "八一广场站-A口" 统一截取为 "八一广场站"
      let baseName = rawName.split(/地铁站|\(|-/)[0];
      if (!baseName.endsWith('站')) baseName += '站';
      
      if (!stationGroups[baseName]) {
        stationGroups[baseName] = [];
      }
      stationGroups[baseName].push({
        coords: [lng, lat],
        fullName: rawName
      });
    });

    // 2.2 遍历每个聚合后的站点进行多层级渲染
    Object.keys(stationGroups).forEach(stationName => {
      const exits = stationGroups[stationName];
      const coordArray = exits.map(e => e.coords);

      // 利用 Turf.js 计算所有出口的中心点，作为该地铁站的“正心”
      const ptsCollection = turf.featureCollection(coordArray.map(c => turf.point(c)));
      const centerPt = turf.center(ptsCollection).geometry.coordinates;

      // 核心层 A：绘制站点主图标 (用于宏观辨识)
      const centerMarker = new AMap.Marker({
        position: centerPt,
        content: `<div class="subway-main-icon" title="${stationName}">🚇</div>`,
        offset: new AMap.Pixel(-12, -12),
        zIndex: 100 // 层级调高，防止被网格压住
      });
      centerMarker.setMap(map);
      transitMarkers.push(centerMarker);

      // 核心层 B：绘制每一个具体的出口微点 (用于微空间精准选址)
      exits.forEach(exit => {
        const exitMarker = new AMap.Marker({
          position: exit.coords,
          content: `<div class="subway-exit-dot" title="${exit.fullName}"></div>`,
          offset: new AMap.Pixel(-4, -4),
          zIndex: 105
        });
        exitMarker.setMap(map);
        transitMarkers.push(exitMarker);
      });

      const walkRadius = 300;
      const coverageCircle = new AMap.Circle({
        center: centerPt,
        radius: walkRadius, // 单位：米
        fillColor: '#0ea5e9',
        // 使用极低的透明度，在暗色底图上形成优雅的“光晕”效果，且绝不会遮挡底层网格
        fillOpacity: 0.04, 
        strokeColor: '#38bdf8',
        strokeWeight: 1,
        strokeStyle: 'dashed',
        strokeOpacity: 0.6,
        zIndex: 88,
        bubble: true // 允许鼠标事件穿透到下方的分析网格
      });
      
      coverageCircle.setMap(map);
      transitMarkers.push(coverageCircle);
    });
  }

  // ⚠️ 3. 渲染 高架桥/邻避点气泡 (环境风险)
  if (nimbyFeatures && nimbyFeatures.features) {
    nimbyFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: `<div class="poi-marker poi-nimby" title="${item.properties.name || ''}">⚠️</div>`,
        offset: new AMap.Pixel(-10, -10),
        zIndex: 90
      });
      marker.setMap(map);
      nimbyMarkers.push(marker); // 正确挂载到全局数组
    });
  }
  
  // 🔄 最终联动：根据当前工具栏控制的默认显隐状态，决定新生成的图层是显示还是隐藏
  // （比如用户刚把交通关了，突然刷新了网格，这里可以保证它继续保持隐藏状态）
  parkMarkers.forEach(m => layerVisibility.value.parks ? m.show() : m.hide());
  transitMarkers.forEach(m => layerVisibility.value.transits ? m.show() : m.hide());
  nimbyMarkers.forEach(m => layerVisibility.value.nimbys ? m.show() : m.hide());
};
</script>


<style scoped>
/* ==========================================
   1. 基础框架与页面初始化
   ========================================== */
.analysis-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #020617;
  color: #fff;
  font-family: "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: hidden;
}

.analysis-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  backdrop-filter: blur(10px);
  z-index: 20;
}

.platform-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-btn { 
  color: #38bdf8;
  text-decoration: none;
  font-size: 13px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 5px 14px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.02);
  transition: all 0.2s ease;
}
.nav-btn:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
}

.content-body { 
  flex: 1; 
  display: flex; 
  overflow: hidden; 
  position: relative;
}

/* ==========================================
   2. 左侧控制面板（参数输入区）
   ========================================== */
.control-panel {
  width: 350px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 15, 32, 0.98) 100%);
  border-right: 1px solid rgba(59, 130, 246, 0.15);
  padding: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
}

.title { 
  color: #38bdf8; 
  font-size: 16px; 
  margin-top: 0;
  margin-bottom: 20px; 
  border-left: 3px solid #3b82f6; 
  padding-left: 10px; 
  font-weight: 600;
}

/* 核心指标卡片 */
.stat-card { 
  background: rgba(30, 41, 59, 0.4); 
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 18px; 
  border-radius: 8px; 
  margin-bottom: 20px; 
}
.stat-label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
.stat-value { 
  font-size: 36px; 
  font-weight: 800; 
  color: #10b981; 
  margin: 2px 0 12px 0; 
  font-family: Arial, sans-serif; 
  letter-spacing: -0.5px;
  display: flex;
  align-items: baseline;
}
.stat-value small { font-size: 16px; margin-left: 2px; font-weight: 500; }

.stat-bar { height: 5px; background: #1e293b; border-radius: 3px; overflow: hidden;}
.bar-inner { height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }

.expert-advice {
  font-size: 12px;
  margin-top: 10px;
  margin-bottom: 0;
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  padding: 6px 10px;
  border-radius: 4px;
}
.expert-advice.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

/* 覆盖率效益提升动效标签 */
.delta-badge {
  font-size: 11px; 
  color: #10b981; 
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 2px 8px; 
  border-radius: 12px; 
  margin-left: 12px;
  font-weight: 500;
  font-family: sans-serif;
  animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* 沙盘推演区样式 */
.param-setting-box {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}
.param-title { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;}
.scenario-context { 
  background: rgba(30, 41, 59, 0.5); 
  padding: 8px 12px; border-radius: 4px; 
  font-size: 12px; line-height: 1.6; 
  color: #94a3b8; margin-bottom: 14px; 
  border-left: 2px solid #60a5fa;
}
.scenario-context strong { color: #60a5fa; }

.preset-label { font-size: 12px; color: #64748b; margin-bottom: 8px; }
.preset-group { display: flex; gap: 6px; margin-bottom: 16px; }
.preset-btn { 
  flex: 1; padding: 7px 0; font-size: 12px; font-weight: bold;
  background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); 
  color: #94a3b8; border-radius: 4px; cursor: pointer; transition: all 0.2s;
}
.preset-btn:hover { background: rgba(59,130,246,0.15); color: #cbd5e1; }
.preset-btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; box-shadow: 0 0 12px rgba(37, 99, 235, 0.4); }

.param-item { margin-bottom: 14px; }
.param-item:last-child { margin-bottom: 0; }
.param-label { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;}
.param-val { color: #38bdf8; font-weight: bold; font-family: monospace; font-size: 13px;}

.custom-slider { 
  width: 100%; 
  accent-color: #3b82f6; 
  cursor: ew-resize; 
  height: 4px; 
  background: #1e293b;
  border-radius: 2px;
  outline: none;
}

/* 终极触发按钮 */
.action-btn { 
  width: 100%; padding: 12px; 
  background: linear-gradient(135deg, #1d4ed8, #1e40af); 
  border: 1px solid rgba(96, 165, 250, 0.4);
  color: #fff; border-radius: 6px; cursor: pointer; 
  font-weight: 600; font-size: 13px; letter-spacing: 0.5px;
  transition: all 0.2s ease; 
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
}
.action-btn:hover { 
  background: linear-gradient(135deg, #2563eb, #1d4ed8); 
  transform: translateY(-1px); 
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
}
.action-btn:active { transform: translateY(1px); }


/* ==========================================
   3. 右侧地图区与浮动图面交互组件
   ========================================== */
.map-section { 
  flex: 1; 
  position: relative;
  overflow: hidden;
}

/* 区域/比例尺状态浮动标签 */
.view-label {
  position: absolute; 
  top: 16px; 
  left: 16px; 
  z-index: 99;
  background: rgba(15, 23, 42, 0.85); 
  backdrop-filter: blur(8px);
  padding: 8px 14px; 
  border: 1px solid rgba(59, 130, 246, 0.3); 
  border-radius: 6px; 
  color: #e2e8f0; 
  font-size: 12px;
  display: flex; 
  align-items: center; 
  gap: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: none; /* 穿透不遮挡地图拖拽 */
}

.theme-badge {
  background: rgba(59, 130, 246, 0.2); 
  color: #60a5fa; 
  border: 1px solid rgba(59, 130, 246, 0.4);
  padding: 1px 6px; 
  border-radius: 4px; 
  font-weight: 600;
  font-size: 11px;
}

/* 🗺️ 新增：地图右上角一体化图面交互工具栏 */
.map-toolbar-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(10px);
  padding: 5px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
}

/* 磁贴工具按钮 */
.toolbar-tile {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.toolbar-tile {
  background: rgba(15, 23, 42, 0.6); /* 更加通透的暗色背景 */
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #64748b; /* 🚫 默认未激活状态：呈现冷灰色，代表关闭 */
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toolbar-tile:hover {
  background: rgba(30, 41, 59, 0.8);
  color: #94a3b8;
}

/* ⚡ 新增：图层按钮激活状态的样式 */
.active-tile {
  background: rgba(30, 41, 59, 0.9) !important;
  color: #38bdf8 !important; /* 💎 激活状态：高亮天蓝色 */
  border-color: rgba(56, 189, 248, 0.4) !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
  font-weight: 600;
}

/* 选址处于激活激活状态 */
.simulating-active {
  background: #f59e0b !important; 
  color: #020617 !important; 
  border-color: #f59e0b !important;
  font-weight: 600;
  animation: pulse 1.6s infinite;
}
@keyframes pulse {
  0% { opacity: 1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); } 
  50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); } 
  100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

/* 磁贴式微型撤销按钮 */
.toolbar-undo-tile {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.25s ease;
}
.toolbar-undo-tile:hover {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
}

/* 底部图例样式 */
.map-legend-overlay {
  position: absolute; 
  bottom: 16px; 
  right: 16px; 
  z-index: 99;
  background: rgba(15, 23, 42, 0.85); 
  backdrop-filter: blur(8px);
  padding: 10px 14px;
  border: 1px solid rgba(51, 65, 85, 0.5); 
  border-radius: 6px; 
  font-size: 11px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.legend-title { color: #94a3b8; font-weight: 500; margin-bottom: 6px; }
.legend-bars { display: flex; gap: 12px; }
.legend-bars span { display: flex; align-items: center; gap: 4px; color: #cbd5e1; }
.bar { width: 14px; height: 7px; border-radius: 1px; display: inline-block; }
.bar-low { background: #334155; border: 1px solid rgba(255,255,255,0.1); }
.bar-mid { background: #f59e0b; }
.bar-high { background: #10b981; }


/* ==========================================
   4. 地图组件穿透样式（AMap弹窗、雷达点）
   ========================================== */
:deep(.radar-dot) { width: 16px; height: 16px; background: rgba(248, 113, 113, 0.25); border-radius: 50%; position: relative; }
:deep(.radar-dot::after) { content: ""; position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; background: #f87171; border-radius: 50%; transform: translate(-50%, -50%); animation: radar-pulse 2s infinite; }
@keyframes radar-pulse { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 350%; height: 350%; opacity: 0; } }

/* ==========================================
   5. 定制化环境要素气泡图标 (POI Markers)
   ========================================== */
/* ==========================================
   5. 定制化环境要素气泡图标 (POI Markers)
   ========================================== */
:deep(.poi-marker) {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: transform 0.2s;
  cursor: pointer;
}
:deep(.poi-marker:hover) {
  transform: scale(1.3);
  z-index: 999;
}
:deep(.poi-park) { background-color: #10b981; }    /* 绿色：生态疗愈 */
:deep(.poi-transit) { background-color: #0284c7; } /* 蓝色：交通节点 */
:deep(.poi-nimby) { background-color: #ef4444; }   /* 红色：邻避排斥 */

/* AMap 高级自定义信息弹窗 */
.custom-info-window { pointer-events: auto; }
.custom-info-window ul { touch-action: pan-y; }
.custom-info-window ul::-webkit-scrollbar { width: 4px; }
.custom-info-window ul::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 2px; }

:deep(.custom-info-window) { background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(6px); border: 1px solid #3b82f6 !important; border-radius: 6px; padding: 12px; min-width: 210px; color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.6); }
:deep(.window-header) { font-weight: 600; color: #38bdf8 !important; border-bottom: 1px solid rgba(59, 130, 246, 0.2) !important; padding-bottom: 6px; margin-bottom: 8px; font-size: 13px; }
:deep(.window-body) { font-size: 12px; }
:deep(.window-body ul) { list-style: none; padding: 0; margin: 4px 0 0 0; max-height: 140px; overflow-y: auto; }
:deep(.window-body li) { padding: 5px 0; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.05); }

/* 复写高德原生外壳，确保无边框穿透 */
:deep(.amap-info-content) { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
:deep(.amap-info-sharp) { border-top-color: rgba(15, 23, 42, 0.95) !important; }

/* ==========================================
   新增：地铁精细化标识样式
   ========================================== */
/* 地铁主核心图标 */
:deep(.subway-main-icon) {
  width: 24px;
  height: 24px;
  background: rgba(15, 23, 42, 0.9);
  border: 1.5px solid #38bdf8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
  cursor: pointer;
  transition: transform 0.2s ease;
}
:deep(.subway-main-icon:hover) {
  transform: scale(1.2);
  box-shadow: 0 0 20px #38bdf8;
}

/* 具体出口微型小圆点 */
:deep(.subway-exit-dot) {
  width: 8px;
  height: 8px;
  background: #38bdf8;
  border: 1px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.8);
  cursor: help;
  transition: transform 0.15s ease;
}
:deep(.subway-exit-dot:hover) {
  transform: scale(1.5);
  background: #00ffff;
}

/* 新增：侧边栏结构化样式 */
.panel-main-title {
  font-size: 18px;
  color: #fff;
  margin-bottom: 12px;
  text-align: center;
  font-weight: 600;
  letter-spacing: 1px;
}
.platform-intro {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.6;
  padding-bottom: 16px;
  border-bottom: 1px dashed rgba(59, 130, 246, 0.3);
}
.platform-intro strong { color: #38bdf8; }

.module-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}
.module-title {
  font-size: 14px;
  color: #60a5fa;
  margin-top: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
  padding-bottom: 8px;
  font-weight: bold;
}

/* 优化禁用状态的滑块，让逻辑更严谨 */
.custom-slider:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.preset-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.preset-btn {
  flex: 1;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #cbd5e1;
  padding: 6px 0;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.preset-btn:hover { background: rgba(59, 130, 246, 0.2); color: #fff; }

/* --- 新增：分级查询过滤器组样式 --- */
.filter-section {
  background: rgba(15, 23, 42, 0.7);
  border-left: 3px solid #f59e0b;
}
.grade-filter-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.filter-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}
.filter-btn:hover { background: rgba(255,255,255,0.1); }
.active-all { background: rgba(59,130,246,0.2) !important; color: #60a5fa !important; border-color: #3b82f6 !important; }
.active-a { background: rgba(34,211,238,0.2) !important; color: #22d3ee !important; border-color: #22d3ee !important; }
.active-b { background: rgba(245,158,11,0.2) !important; color: #f59e0b !important; border-color: #f59e0b !important; }
.active-c { background: rgba(239,68,68,0.2) !important; color: #ef4444 !important; border-color: #ef4444 !important; }
</style>