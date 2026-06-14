// useSpatialAnalysis.js — 空间分析引擎
// 从 ConvergeAnalysis.vue 提取：网格剖分、医院覆盖、选址评分
// 纯计算 + turf.js，不涉及 AMap 渲染
import { ref } from 'vue';
import * as turf from '@turf/turf';
import { riverZones, exclusionZones } from '../data/riverExclusionZones.js';

export function useSpatialAnalysis() {
  const coverageRate = ref(0);
  const totalGridCount = ref(0);

  // ---- 工具函数 ----

  /** 医院等级判定 */
  function getHospitalTier(type) {
    if (!type) return 3;
    if (type.includes('三级甲等')) return 1;
    if (type.includes('综合医院')) return 2;
    return 3;
  }

  /** 生成医院服务区缓冲面 */
  function computeHospitalBuffers(facilityData) {
    return facilityData.map(d => {
      const tier = getHospitalTier(d.type);
      const radiusKm = tier === 1 ? 3 : tier === 2 ? 2 : 1;
      const weight = tier === 1 ? 3 : tier === 2 ? 2 : 1;
      return {
        buffer: turf.buffer(turf.point([d.lng, d.lat]), radiusKm, { units: 'kilometers' }),
        name: d.name, tier, weight, lng: d.lng, lat: d.lat
      };
    });
  }

  /** 0.8km 范围内 GeoJSON 要素计数 */
  function getCountInRange(geoJsonData, centerPt, radiusKm) {
    if (!geoJsonData?.features?.length) return { count: 0, minDist: 999 };
    let count = 0, minDist = 999;
    geoJsonData.features.forEach(f => {
      try {
        const dist = turf.distance(centerPt, f, { units: 'kilometers' });
        if (dist < minDist) minDist = dist;
        if (dist <= radiusKm) count++;
      } catch (e) {}
    });
    return { count, minDist };
  }

  /** 判断点是否在排除区内 */
  function isExcluded(pt) {
    return riverZones.some(z => turf.booleanPointInPolygon(pt, z))
      || turf.booleanPointInPolygon(pt, exclusionZones.lakes)
      || turf.booleanPointInPolygon(pt, exclusionZones.mountains);
  }

  /** 计算单个网格选址评分 */
  function scoreGridCell(centerPt, covering, medicalCount, pd, stationCount, nd, weights) {
    let score = 65
      + Math.min(30, (pd.count || 0) * 4 * weights.park)
      + Math.min(30, stationCount * 15 * weights.transit)
      - ((nd.count || 0) * 15 * weights.nimby);
    if (nd.minDist < 0.2) score -= 40 * weights.nimby;
    return Math.max(0, Math.min(100, Math.floor(score)));
  }

  // ---- 核心：执行空间分析 ----

  /**
   * @param {Array} bbox — [minLng, minLat, maxLng, maxLat]
   * @param {Object} options
   * @param {Array}  options.facilityData
   * @param {Object} options.parkFeatures
   * @param {Array}  options.transitPolygons — 地铁服务区面数组
   * @param {Object} options.nimbyFeatures
   * @param {Object} options.weights — { park, transit, nimby }
   * @param {string} options.gradeFilter — 'ALL' | 'A' | 'B' | 'C'
   * @param {boolean} options.showEvaluationMode
   * @param {number} [options.gridCellSize=0.8]
   * @returns {{ coveredCells, validGridCount, cells: Array }}
   */
  function analyzeGrid(bbox, options) {
    const {
      facilityData, parkFeatures, transitPolygons, nimbyFeatures,
      weights, gradeFilter, showEvaluationMode,
      gridCellSize = 0.8, richThreshold = 3
    } = options;

    const squareGrid = turf.squareGrid(bbox, gridCellSize, { units: 'kilometers' });
    const hospitalBuffers = computeHospitalBuffers(facilityData);
    let coveredCells = 0, validGridCount = 0;
    const cells = [];

    squareGrid.features.forEach((cell) => {
      const centerPt = turf.center(cell);
      const [lng, lat] = centerPt.geometry.coordinates;
      if (isExcluded(centerPt)) return;

      validGridCount++;

      // 医院覆盖
      const covering = hospitalBuffers.filter(h => {
        try { return turf.booleanPointInPolygon(centerPt, h.buffer); } catch (e) { return false; }
      });
      const rawWeight = covering.reduce((s, h) => s + h.weight, 0);
      const medicalWeight = Math.min(5, rawWeight);
      const medicalCount = covering.length;
      if (medicalWeight >= 1) coveredCells++;

      // 公园/地铁/道路
      const pd = getCountInRange(parkFeatures, centerPt, 0.8);
      const stationCount = transitPolygons.filter(p => {
        try { return turf.booleanPointInPolygon(centerPt, p); } catch (e) { return false; }
      }).length;
      const nd = getCountInRange(nimbyFeatures, centerPt, 1.0);

      const score = scoreGridCell(centerPt, covering, medicalCount, pd, stationCount, nd, weights);

      // 分级过滤
      if (showEvaluationMode && gradeFilter !== 'ALL') {
        if (gradeFilter === 'A' && score < 80) return;
        if (gradeFilter === 'B' && (score >= 80 || score < 60)) return;
        if (gradeFilter === 'C' && score >= 60) return;
      }

      // 染色
      let fillColor = medicalCount >= richThreshold ? '#10b981'
        : (medicalCount >= 1 ? '#f59e0b' : '#334155');
      let strokeColor = 'rgba(255,255,255,0.15)', strokeWeight = 0.8;
      const baseFillOpacity = medicalCount > 0 ? 0.12 : 0.02;

      if (showEvaluationMode) {
        if (score >= 80) { strokeColor = '#22d3ee'; strokeWeight = 2.5; fillColor = '#22d3ee'; }
        else if (score >= 60) { strokeColor = '#f59e0b'; strokeWeight = 2.5; fillColor = '#f59e0b'; }
        else { strokeColor = '#ef4444'; strokeWeight = 2.5; fillColor = '#ef4444'; }
      }

      cells.push({
        geometry: cell.geometry,
        center: { lng, lat },
        medicalWeight, medicalCount, covering,
        score, fillColor, strokeColor, strokeWeight,
        baseFillOpacity, showEvaluationMode,
        pd, stationCount, nd
      });
    });

    // 副作用：更新覆盖率（保持和旧代码一致的行为）
    coverageRate.value = validGridCount > 0
      ? parseFloat((coveredCells / validGridCount * 100).toFixed(1))
      : 0;
    totalGridCount.value = validGridCount;

    return { coveredCells, validGridCount, cells, hospitalBuffers };
  }

  return {
    coverageRate, totalGridCount,
    getHospitalTier, computeHospitalBuffers,
    getCountInRange, isExcluded, scoreGridCell,
    analyzeGrid
  };
}
