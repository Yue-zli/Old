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
              <div class="param-label"><span>🛣️ 高架/快速路环境影响</span><span class="param-val">x {{ weightNimby }}</span></div>
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
          <button class="toolbar-tile" :class="{ 'active-tile' : layerVisibility.parks }" @click="toggleLayer('parks')">
            <span class="tile-icon">🌳</span><span class="tile-text">公园</span>
          </button>
          <button class="toolbar-tile" :class="{ 'active-tile' : layerVisibility.transits }" @click="toggleLayer('transits')">
            <span class="tile-icon">🚇</span><span class="tile-text">地铁</span>
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

        <!-- 医院分级查询 -->
        <div class="hospital-filter-overlay">
          <button class="filter-chip" :class="{ 'chip-active': hospitalFilter === 'all' }" @click="setHospitalFilter('all')">全部医院</button>
          <button class="filter-chip" :class="{ 'chip-active': hospitalFilter === 'tier1' }" @click="setHospitalFilter('tier1')">仅三甲</button>
          <button class="filter-chip" :class="{ 'chip-active': hospitalFilter === 'tier12' }" @click="setHospitalFilter('tier12')">三甲+综合</button>
          <button class="filter-chip" :class="{ 'chip-active': hospitalFilter === 'tier3' }" @click="setHospitalFilter('tier3')">仅专科</button>
        </div>

        <!-- 图层要素图例 -->
        <div class="map-legend-overlay">
          <div class="legend-title">地图要素说明</div>
          <div class="legend-items">
            <div class="legend-row">
              <div class="legend-dot" style="width:8px;height:8px;border-radius:50%;background:#22d3ee;border:1px solid #fff;"></div>
              <span>医疗设施</span>
            </div>
            <div class="legend-row">
              <div class="legend-dot" style="width:8px;height:8px;background:#10b981;border:1px solid #fff;"></div>
              <span>公园绿地</span>
            </div>
            <div class="legend-row">
              <div class="legend-dot" style="width:12px;height:5px;background:rgba(56,189,248,0.3);border:1px dashed #38bdf8;"></div>
              <span>地铁站服务区</span>
            </div>
            <div class="legend-row">
              <div class="legend-dot" style="width:12px;height:5px;background:rgba(239,68,68,0.2);border:1px dashed #ef4444;"></div>
              <span>高架/快速路影响带</span>
            </div>
          </div>
          <div class="legend-divider"></div>
          <div class="legend-hint">💡 点击地图上的图标可查看详情</div>
          <div class="legend-title">{{ showEvaluationMode ? '选址评分等级' : '医疗覆盖密度' }}</div>
          <div class="legend-bars" v-if="!showEvaluationMode">
            <span><div class="bar bar-low"></div> 稀缺</span>
            <span><div class="bar bar-mid"></div> 覆盖</span>
            <span><div class="bar bar-high"></div> 充沛</span>
          </div>
          <div class="legend-bars" v-else>
            <span><div class="bar" style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444;"></div> 不宜建设</span>
            <span><div class="bar" style="background: rgba(245, 158, 11, 0.2); border: 2px solid #f59e0b;"></div> 备选区域</span>
            <span><div class="bar" style="background: rgba(34, 211, 238, 0.2); border: 2px solid #22d3ee;"></div> 优选区域</span>
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
import parkData from '../data/real_parks.json';
import transitData from '../data/nanchang_transit.json';
import nimbyData from '../data/nanchang_nimby.json';

// --- 状态变量 ---
const showEvaluationMode = ref(false);
const weightPark = ref(1.0);
const weightTransit = ref(1.0);
const weightNimby = ref(2.0);
const activeGradeFilter = ref('ALL'); // 网格分级筛选
const hospitalFilter = ref('all');    // 医院分级查询

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

const setHospitalFilter = (filter) => {
  hospitalFilter.value = filter;
  // 根据等级显示/隐藏医院标记
  facilityMarkers.forEach(m => {
    if (!m._tier) return; // 跳过非医院标记（如文字标签）
    if (filter === 'all') { m.show(); return; }
    if (filter === 'tier1') { m._tier === 1 ? m.show() : m.hide(); return; }
    if (filter === 'tier12') { m._tier <= 2 ? m.show() : m.hide(); return; }
    if (filter === 'tier3') { m._tier === 3 ? m.show() : m.hide(); return; }
  });
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

  // 缩放到近景时显示细节图层（公园/地铁各自独立控制）
  const shouldShowNimby = zoom >= 13.5 && layerVisibility.value.nimbys;
  nimbyMarkers.forEach(m => shouldShowNimby ? m.show() : m.hide());
  const shouldShowBasic = zoom >= 12.5;
  if (layerVisibility.value.parks) parkMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
  if (layerVisibility.value.transits) transitMarkers.forEach(m => shouldShowBasic ? m.show() : m.hide());
};

let map = null;
let facilityMarkers = [];
let parkMarkers = [];
let transitMarkers = [];
let nimbyMarkers = [];
let infoWindow = null;
let transitPolygons = []; // 地铁站服务区面（用于评分）

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
      
      infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30), closeWhenClickMap: true });
      map.on('complete', () => {
        renderEnvironmentLayers();  // 先生成面（填充 transitPolygons），再评分
        startAnalysis();
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

  // 医院分级：根据 type 字段判断
  const getHospitalTier = (type) => {
    if (!type) return 3;
    if (type.includes('三级甲等')) return 1;          // 三甲
    if (type.includes('综合医院')) return 2;           // 综合医院
    return 3;                                          // 专科/其他
  };
  // 医院服务区缓冲面：三甲3km / 综合2km / 专科1km
  const hospitalBuffers = facilityData.map(d => {
    const tier = getHospitalTier(d.type);
    const radiusKm = tier === 1 ? 3 : tier === 2 ? 2 : 1;
    const weight = tier === 1 ? 3 : tier === 2 ? 2 : 1;
    return {
      buffer: turf.buffer(turf.point([d.lng, d.lat]), radiusKm, { units: 'kilometers' }),
      name: d.name, tier, weight, lng: d.lng, lat: d.lat
    };
  });

  let coveredCells = 0; let validGridCount = 0;
  
  // 赣江多分支排除 — 每条线各自缓冲，逐个判断（避免 union 在不重叠时返回 null）
  const riverMain = turf.buffer(turf.lineString([
    [115.813531, 28.559122], [115.820607, 28.585707],
    [115.827391, 28.607841], [115.836063, 28.624838],
    [115.843848, 28.639141], [115.860899, 28.655955],
    [115.864645, 28.664164], [115.867854, 28.675827],
    [115.87386, 28.685062],  [115.88685, 28.698198]
  ]), 0.65, { units: 'kilometers' });

  const riverBranch1 = turf.buffer(turf.lineString([
    [115.889321, 28.710838], [115.892347, 28.719039],
    [115.893538, 28.728927], [115.894593, 28.736363],
    [115.89527, 28.74478],   [115.903619, 28.755819],
    [115.91873, 28.765207],  [115.935743, 28.771323]
  ]), 0.5, { units: 'kilometers' });

  const riverBranch2 = turf.buffer(turf.lineString([
    [115.904342, 28.707857], [115.914689, 28.714304],
    [115.922442, 28.719456]
  ]), 0.5, { units: 'kilometers' });

  const riverBranch21 = turf.buffer(turf.lineString([
    [115.925682, 28.725122], [115.931217, 28.731904],
    [115.935265, 28.735839], [115.947193, 28.74853],
    [115.964565, 28.762397], [115.977559, 28.773416]
  ]), 0.4, { units: 'kilometers' });

  const riverBranch22 = turf.buffer(turf.lineString([
    [115.933195, 28.721669], [115.941853, 28.727136],
    [115.958264, 28.733389], [115.971216, 28.734178],
    [115.981191, 28.730595], [115.991096, 28.727376],
    [116.002265, 28.72484],  [116.016338, 28.724322]
  ]), 0.35, { units: 'kilometers' });

  const riverZones = [riverMain, riverBranch1, riverBranch2, riverBranch21, riverBranch22];

  const exclusionZones = {
    lakes: turf.multiPolygon([[[[115.990, 28.660], [116.030, 28.660], [116.030, 28.720], [115.990, 28.720], [115.990, 28.660]]]]),
    mountains: turf.polygon([[[115.600, 28.740], [115.730, 28.740], [115.760, 28.780], [115.750, 28.880], [115.600, 28.880], [115.600, 28.740]]])
  };

  squareGrid.features.forEach((cell) => {
    const currentCenterPt = turf.center(cell);
    const [lng, lat] = currentCenterPt.geometry.coordinates;
    const isExcluded = riverZones.some(z => turf.booleanPointInPolygon(currentCenterPt, z))
      || turf.booleanPointInPolygon(currentCenterPt, exclusionZones.lakes)
      || turf.booleanPointInPolygon(currentCenterPt, exclusionZones.mountains);
    if (isExcluded) return;

    validGridCount++;
    // 网格中心被哪些医院服务区覆盖（三甲3km/综合2km/专科1km）
    const covering = hospitalBuffers.filter(h => {
      try { return turf.booleanPointInPolygon(currentCenterPt, h.buffer); } catch (e) { return false; }
    });
    const medicalWeight = covering.reduce((s, h) => s + h.weight, 0);
    const medicalCount = covering.length;
    cell.properties.count = medicalWeight;
    if (medicalWeight >= 1) coveredCells++;

    const pd = getCountInRange(parkFeatures, currentCenterPt, 0.8);
    // 地铁改面状评分：网格中心落在几个站点服务区内（一站点只算一次）
    const stationCount = transitPolygons.filter(p => {
      try { return turf.booleanPointInPolygon(currentCenterPt, p); } catch (e) { return false; }
    }).length;
    const nd = getCountInRange(nimbyFeatures, currentCenterPt, 1.0);

    let score = 65 + Math.min(30, (pd.count || 0) * 4 * weightPark.value) + Math.min(30, stationCount * 15 * weightTransit.value) - ((nd.count || 0) * 15 * weightNimby.value);
    if (covering.some(h => h.name.includes('拟建'))) score += 15;
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

    // 鼠标悬浮：高亮 + 显示弹窗
    polygon.on('mouseover', (e) => {
      polygon.setOptions({ fillOpacity: 0.4, strokeColor: '#fff', strokeWeight: 2 });
      let popupContent = '';
      
      // ---- 弹窗内容 ----
      if (showEvaluationMode.value) {
        // === 评估模式：分级汇总 ===
        const tier1Count = covering.filter(h => h.tier === 1).length;
        const tier2Count = covering.filter(h => h.tier === 2).length;
        const tier3Count = covering.filter(h => h.tier === 3).length;
        let medicalDesc = '<span style="color:#ef4444;">盲区</span>';
        if (medicalCount > 0) {
          const parts = [];
          if (tier1Count) parts.push(`<span style="color:#06b6d4;">三甲×${tier1Count}</span>`);
          if (tier2Count) parts.push(`<span style="color:#0ea5e9;">综合×${tier2Count}</span>`);
          if (tier3Count) parts.push(`<span style="color:#94a3b8;">专科×${tier3Count}</span>`);
          medicalDesc = parts.join(' '); // 医院仅展示，不参与选址评分
        }

        let parkDesc = pd.count > 0 ? `<span style="color:#10b981;">${pd.count}处 (+${Math.min(30, pd.count * 4 * weightPark.value)}分)</span>` : `<span style="color:#94a3b8;">无公园</span>`;
        let transitDesc = stationCount > 0 ? `<span style="color:#38bdf8;">${stationCount}个站 (+${Math.min(30, stationCount * 15 * weightTransit.value)}分)</span>` : `<span style="color:#f59e0b;">无地铁覆盖</span>`;
        let nimbyDesc = nd.count > 0 ? `<span style="color:#ef4444;">附近 ${(nd.minDist * 1000).toFixed(0)}m 有高架/快速路</span>` : `<span style="color:#10b981;">无道路干扰</span>`;
        const advice = score >= 80 ? '<div style="color: #22d3ee; background: rgba(34,211,238,0.1); padding:6px; border-radius:4px;">🔥 A级优选：极度适宜建设</div>'
                     : (score >= 60 ? '<div style="color: #f59e0b; background: rgba(245,158,11,0.1); padding:6px; border-radius:4px;">⚠️ B级备选：需增设隔音/绿化</div>'
                                : '<div style="color: #ef4444; background: rgba(239,68,68,0.1); padding:6px; border-radius:4px;">🛑 C级高危：道路环境影响较大</div>');
        popupContent = `
          <div class="custom-info-window" style="min-width: 300px;">
            <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid rgba(59,130,246,0.3); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between;">
              <span>🎯 选址综合诊断评估</span><span style="color: ${score >= 80 ? '#22d3ee' : (score >= 60 ? '#f59e0b' : '#ef4444')}; font-size: 16px;">${score} 分</span>
            </div>
            <div style="font-size: 12px; line-height: 1.8; margin-bottom: 10px;">
                <div><strong>🏥 医疗资源：</strong>${medicalDesc}</div>
                <div><strong>🌳 公园绿地：</strong>${parkDesc}</div>
                <div><strong>🚇 地铁交通：</strong>${transitDesc}</div>
                <div><strong>🛣️ 道路环境：</strong>${nimbyDesc}</div>
            </div>
            ${advice}
          </div>`;
      } else {
        // === 普通模式：按等级分组展示（避免列20+个医院名） ===
        if (medicalCount > 0) {
           const tier1Names = covering.filter(h => h.tier === 1).map(h => h.name);
           const tier2Names = covering.filter(h => h.tier === 2).map(h => h.name);
           const tier3Count = covering.filter(h => h.tier === 3).length;
           let listHTML = '';
           if (tier1Names.length) listHTML += `<div style="color:#06b6d4;font-weight:bold;margin-top:4px;">▸ 三甲 (${tier1Names.length}家)</div>`
             + tier1Names.slice(0, 5).map(n => `<li>📍 ${n}</li>`).join('')
             + (tier1Names.length > 5 ? `<li style="color:#64748b;">...还有${tier1Names.length - 5}家</li>` : '');
           if (tier2Names.length) listHTML += `<div style="color:#0ea5e9;font-weight:bold;margin-top:4px;">▸ 综合 (${tier2Names.length}家)</div>`
             + tier2Names.slice(0, 5).map(n => `<li>📍 ${n}</li>`).join('')
             + (tier2Names.length > 5 ? `<li style="color:#64748b;">...还有${tier2Names.length - 5}家</li>` : '');
           if (tier3Count) listHTML += `<div style="color:#94a3b8;font-weight:bold;margin-top:4px;">▸ 专科/其他 (${tier3Count}家)</div>`;
           popupContent = `
            <div class="custom-info-window" style="min-width: 240px;">
              <div class="window-header">🏥 医疗覆盖评估</div>
              <div class="window-body">
                <p style="margin: 0 0 6px 0; color: #10b981;">覆盖 ${medicalCount} 处设施（仅供参考，不参与评分）</p>
                <ul style="max-height: 200px; overflow-y: auto; font-size:11px;">${listHTML}</ul>
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

    // 鼠标离开：恢复样式，弹窗保持打开（点击地图空白处关闭）
    polygon.on('mouseout', ()=> {
      polygon.setOptions({ fillOpacity: showEvaluationMode.value ? 0.15 : baseFillOpacity, strokeWeight: strokeWeight, strokeColor: strokeColor });
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
  
  // 如果 markers 已存在则跳过（防止重复创建）
  if (parkMarkers.length > 0 || transitMarkers.length > 0 || nimbyMarkers.length > 0) {
    return;
  }

  // 🏥 0. 医疗设施：三级分级展示 + 200m内同院合并
  if (facilityData && facilityMarkers.length === 0) {
    const getTier = (type) => {
      if (!type) return 3;
      if (type.includes('三级甲等')) return 1;
      if (type.includes('综合医院')) return 2;
      return 3;
    };

    // 200m内聚类合并（门诊/院区 → 归入同一家医院）
    const dist = (a, b) => {
      const dx = (a.lng - b.lng) * 111320 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
      const dy = (a.lat - b.lat) * 111320;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const clusters = [];
    facilityData.forEach(item => {
      let found = false;
      for (const c of clusters) {
        if (dist(item, c.rep) < 200) { c.members.push(item); found = true; break; }
      }
      if (!found) clusters.push({ rep: item, members: [item] });
    });

    clusters.forEach(cluster => {
      // 取簇内最高等级（数字最小 = 等级最高）
      const bestTier = Math.min(...cluster.members.map(m => getTier(m.type)));
      // 主名：最短的那个（去括号后的核心名），副名：其余
      const names = cluster.members.map(m => m.name.replace(/[\(\（][^)）]*[\)\）]/g, '').trim());
      const mainName = names.reduce((a, b) => a.length <= b.length ? a : b);
      const extraCount = cluster.members.length - 1;
      const tooltip = extraCount > 0
        ? `${mainName} + ${extraCount}个附属设施\n${cluster.members.map(m => '  ' + m.name).join('\n')}`
        : cluster.members[0].name;

      const config = bestTier === 1
        ? { radius: 6, fillColor: '#06b6d4', opacity: 1.0, zIndex: 125 }
        : bestTier === 2
        ? { radius: 4, fillColor: '#0ea5e9', opacity: 0.85, zIndex: 120 }
        : { radius: 2.5, fillColor: '#64748b', opacity: 0.7, zIndex: 115 };

      const rep = cluster.rep;
      const dot = new AMap.CircleMarker({
        center: [rep.lng, rep.lat],
        radius: config.radius,
        fillColor: config.fillColor,
        fillOpacity: config.opacity,
        strokeColor: bestTier === 1 ? '#fff' : '#020617',
        strokeWeight: bestTier === 1 ? 2 : 0.5,
        zIndex: config.zIndex,
        title: tooltip
      });

      // 点击：查周边
      dot.on('click', () => {
        const nearbyParks = [];
        const nearbyStations = new Set();
        if (parkFeatures && parkFeatures.features) {
          parkFeatures.features.forEach(p => {
            const d = turf.distance(turf.point([rep.lng, rep.lat]), p, { units: 'kilometers' });
            if (d <= 1) nearbyParks.push({ name: p.properties.name, dist: d });
          });
        }
        if (transitFeatures && transitFeatures.features) {
          transitFeatures.features.forEach(t => {
            const d = turf.distance(turf.point([rep.lng, rep.lat]), t, { units: 'kilometers' });
            if (d <= 1) {
              let sn = t.properties.name || '';
              sn = sn.replace(/[\(\（][^)）]*[\)\）]/g, '').replace(/地铁站|出入口|\d+号口|[A-Z]口|[南北东西]口/g, '').replace(/·.+$/, '').trim();
              if (sn) nearbyStations.add(sn);
            }
          });
        }
        const tierName = bestTier === 1 ? '三级甲等' : bestTier === 2 ? '综合医院' : '专科/其他';
        const membersHTML = cluster.members.length > 1
          ? `<div style="font-size:10px;color:#64748b;margin-bottom:4px">含：${cluster.members.map(m => m.name).join('、')}</div>`
          : '';
        const parkList = nearbyParks.length > 0
          ? nearbyParks.sort((a,b) => a.dist - b.dist).slice(0,5).map(p => `<div>🌳 ${p.name} (${(p.dist*1000).toFixed(0)}m)</div>`).join('')
          : '<div style="color:#64748b">1km内无公园</div>';
        const stationList = nearbyStations.size > 0
          ? [...nearbyStations].slice(0,5).map(s => `<div>🚇 ${s}</div>`).join('')
          : '<div style="color:#64748b">1km内无地铁站</div>';
        infoWindow.setContent(`
          <div class="custom-info-window" style="min-width:280px">
            <div style="font-size:14px;font-weight:bold;color:#06b6d4;margin-bottom:2px">🏥 ${mainName}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${tierName}${extraCount > 0 ? ` · 共${cluster.members.length}个设施` : ''}</div>
            ${membersHTML}
            <div style="border-top:1px solid rgba(59,130,246,0.2);padding-top:6px;font-size:12px;line-height:1.8">
              <div style="color:#10b981;font-weight:bold;margin-bottom:2px">🌳 周边公园</div>${parkList}
              <div style="color:#38bdf8;font-weight:bold;margin-top:6px;margin-bottom:2px">🚇 周边地铁站</div>${stationList}
            </div>
          </div>
        `);
        infoWindow.open(map, [rep.lng, rep.lat]);
      });

      dot._tier = bestTier;
      dot.setMap(map);
      facilityMarkers.push(dot);

      // 三甲加名称标签（用主名）
      if (bestTier === 1) {
        const label = new AMap.Text({
          text: mainName.length > 8 ? mainName.slice(0, 8) + '...' : mainName,
          position: [rep.lng, rep.lat],
          offset: new AMap.Pixel(10, -10),
          style: {
            'font-size': '9px',
            'color': '#cffafe',
            'background-color': 'rgba(0,0,0,0.6)',
            'border-color': '#06b6d4',
            'border-width': '1px',
            'border-style': 'solid',
            'border-radius': '2px',
            'padding': '1px 4px',
          },
          zIndex: 126
        });
        label._tier = bestTier;
        label.setMap(map);
        facilityMarkers.push(label);
      }
    });
  }

  // 🌳 1. 公园：绿色实心方块（数据源已换为 real_parks.json，全部是真正公园）
  if (parkFeatures && parkFeatures.features) {
    parkFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: '<div style="width:10px;height:10px;background:#10b981;border:2px solid #fff;display:inline-block;font-size:0;line-height:0;vertical-align:top;" title="' + (item.properties.name || '') + '"></div>',
        offset: new AMap.Pixel(-6, -6),
        zIndex: 91
      });
      marker.setMap(map);
      parkMarkers.push(marker);
    });
  }

  // 🚇 2. 地铁：按站聚合为服务区面（凸包 + 分级缓冲）
  transitPolygons = [];
  if (transitFeatures && transitFeatures.features) {
    const stationGroups = {};
    transitFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      const rawName = item.properties.name || '';
      // 清洗：统一各种写法 → 纯站名
      // "地铁大厦地铁站地铁·更新天地南口" / "高新大道(地铁站)" → "地铁大厦站" / "高新大道站"
      let baseName = rawName
        .replace(/[\(\（][^)）]*[\)\）]/g, '')   // 去 (地铁站) (1号口) 等
        .replace(/地铁站/g, '')                   // 去 "地铁站"
        .replace(/·.+$/, '')                     // 去 "·更新天地南口"
        .replace(/\d+号口|[A-Z]口|[南北东西]口/g, '') // 去 "1号口" "南口"
        .replace(/出入口/g, '')                   // 去 "出入口"
        .replace(/地铁$/, '')                     // 去尾部残留 "地铁"
        .trim();
      if (!baseName.endsWith('站')) baseName += '站';
      if (!stationGroups[baseName]) stationGroups[baseName] = [];
      stationGroups[baseName].push([lng, lat]);
    });

    Object.entries(stationGroups).forEach(([stationName, coords]) => {
      // 出口越多 → 缓冲半径越大（300m/350m/400m）
      const exitCount = coords.length;
      let bufferKm = 0.3;
      if (exitCount >= 4) bufferKm = 0.4;
      else if (exitCount >= 2) bufferKm = 0.35;

      let serviceArea;
      if (coords.length >= 2) {
        try {
          const hull = turf.convex(turf.featureCollection(coords.map(c => turf.point(c))));
          if (hull) serviceArea = turf.buffer(hull, bufferKm, { units: 'kilometers' });
        } catch (e) {}
      }
      if (!serviceArea) {
        // 单出口或凸包失败 → 直接缓冲点
        serviceArea = turf.buffer(turf.point(coords[0]), bufferKm, { units: 'kilometers' });
      }

      transitPolygons.push(serviceArea);

      // 绘制服务区面
      try {
        const polygon = new AMap.Polygon({
          path: serviceArea.geometry.coordinates[0],
          fillColor: '#38bdf8',
          fillOpacity: 0.08,
          strokeColor: '#38bdf8',
          strokeWeight: 1,
          strokeOpacity: 0.5,
          strokeStyle: 'dashed',
          zIndex: 55,
          bubble: true
        });
        polygon.setMap(map);
        transitMarkers.push(polygon);

        // 站名标签（面中心）
        const center = turf.center(serviceArea).geometry.coordinates;
        const label = new AMap.Text({
          text: stationName.replace('站', ''),
          position: [center[0], center[1]],
          style: {
            'background-color': 'rgba(15,23,42,0.8)',
            'border-color': '#38bdf8',
            'border-width': '1px',
            'border-style': 'solid',
            'border-radius': '3px',
            'padding': '2px 6px',
            'font-size': '10px',
            'color': '#bae6fd',
            'text-align': 'center',
          },
          zIndex: 110
        });
        label.setMap(map);
        transitMarkers.push(label);
      } catch (e) {}
    });
  }

  // 3. 高架/快速路：按道路聚合为环境影响带（面状要素）
  if (nimbyFeatures && nimbyFeatures.features) {
    const roadGroups = {};
    nimbyFeatures.features.forEach(item => {
      const name = item.properties.name || '';
      // 提取道路名（取"出口""入口""与""交叉口"之前的部分）
      const roadName = name.split(/出口|入口|与|交叉口/)[0].trim();
      if (!roadName) return;
      if (!roadGroups[roadName]) roadGroups[roadName] = [];
      roadGroups[roadName].push(item.geometry.coordinates);
    });

    Object.entries(roadGroups).forEach(([roadName, coords]) => {
      if (coords.length >= 2) {
        // 多个出入口：画缓冲面（道路环境影响带）
        coords.sort((a, b) => a[0] - b[0]);
        try {
          const line = turf.lineString(coords);
          const buffer = turf.buffer(line, 0.3, { units: 'kilometers' });
          const polygon = new AMap.Polygon({
            path: buffer.geometry.coordinates[0],
            fillColor: '#ef4444',
            fillOpacity: 0.08,
            strokeColor: '#ef4444',
            strokeWeight: 1,
            strokeOpacity: 0.4,
            strokeStyle: 'dashed',
            zIndex: 50,
            bubble: true
          });
          polygon.setMap(map);
          nimbyMarkers.push(polygon);
        } catch (e) { /* buffer 失败则跳过 */ }
      } else {
        // 单个出入口：红色三角标记
        const [lng, lat] = coords[0];
        const marker = new AMap.Marker({
          position: [lng, lat],
          content: '<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #ef4444;font-size:0;line-height:0;" title="' + roadName + '"></div>',
          offset: new AMap.Pixel(-5, -10),
          zIndex: 85
        });
        marker.setMap(map);
        nimbyMarkers.push(marker);
      }
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
/* 医院分级查询按钮组 */
.hospital-filter-overlay {
  position: absolute;
  top: 56px;
  right: 16px;
  z-index: 99;
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(10px);
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.5);
}
.filter-chip {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.filter-chip:hover { color: #cbd5e1; border-color: rgba(255,255,255,0.15); }
.filter-chip.chip-active { background: rgba(6,182,212,0.15); color: #06b6d4; border-color: rgba(6,182,212,0.4); font-weight: 600; }

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
.legend-title { color: #94a3b8; font-weight: 500; margin-bottom: 6px; font-size: 11px; }
.legend-items { margin-bottom: 2px; }
.legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 11px; color: #cbd5e1; }
.legend-dot { flex-shrink: 0; }
.legend-divider { border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 0; }
.legend-hint { font-size: 10px; color: #64748b; margin-bottom: 6px; font-style: italic; }
.legend-bars { display: flex; gap: 12px; }
.legend-bars span { display: flex; align-items: center; gap: 4px; color: #cbd5e1; font-size: 11px; }
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

/* 信息窗容器：深色背景 + 滚动支持 */
:deep(.custom-info-window) {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(6px);
  border: 1px solid #3b82f6 !important;
  border-radius: 6px;
  padding: 12px;
  min-width: 210px;
  max-height: 320px;
  overflow-y: auto;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}
:deep(.custom-info-window)::-webkit-scrollbar { width: 4px; }
:deep(.custom-info-window)::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 2px; }
:deep(.window-header) { font-weight: 600; color: #38bdf8 !important; border-bottom: 1px solid rgba(59, 130, 246, 0.2) !important; padding-bottom: 6px; margin-bottom: 8px; font-size: 13px; }
:deep(.window-body) { font-size: 12px; }
:deep(.window-body ul) { list-style: none; padding: 0; margin: 4px 0 0 0; max-height: 140px; overflow-y: auto; }
:deep(.window-body li) { padding: 5px 0; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.05); }

/* 复写高德原生信息窗：启用鼠标交互（滚动/点击），取消默认边框 */
:deep(.amap-info-content) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
  pointer-events: auto !important; /* 必须设为 auto 才能滚动和点击 */
  overflow: visible !important;    /* 不裁剪子元素 */
}
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