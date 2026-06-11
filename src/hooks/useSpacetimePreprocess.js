// useSpacetimePreprocess.js — 4D 时空漫游：时间桶预处理引擎
// 一次性拉取全量订单，按 日(24h)/周(7天)/月(N天) 分桶
// 范围由 selectedDate 决定，而非全部数据
import { ref } from 'vue';
import { getAnimationData } from '../api/stat.js';

export function useSpacetimePreprocess() {
  // ===== 核心状态 =====
  const bucketMap = ref(new Map());
  const timeAxisKeys = ref([]);
  const orderCountPerBucket = ref([]);
  const rawOrders = ref([]);       // 全量原始订单（解析过 _ts）
  const isLoading = ref(false);
  const error = ref(null);

  // ===== 工具函数 =====
  function pad(n) { return String(n).padStart(2, '0'); }

  /** 获取某天是周几（周一=1, 周日=7） */
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;  // 周日=0 → 7
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ===== 核心：按 selectedDate 范围分桶 =====
  function buildBuckets(scale, selectedDate) {
    const orders = rawOrders.value;
    if (!orders || orders.length === 0) {
      bucketMap.value = new Map();
      timeAxisKeys.value = [];
      orderCountPerBucket.value = [];
      return;
    }

    const base = new Date(selectedDate);
    let rangeStart, rangeEnd, keys = [];

    if (scale === 'day') {
      // ── 日维度：selectedDate 0:00 → 23:59，每小时一桶 ──
      rangeStart = new Date(base);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(base);
      rangeEnd.setHours(23, 59, 59, 999);

      for (let h = 0; h < 24; h++) {
        keys.push(`${pad(h)}:00`);
      }

    } else if (scale === 'week') {
      // ── 周维度：周一 → 周日，每天一桶 ──
      const mon = getMonday(base);
      rangeStart = new Date(mon);
      rangeEnd = new Date(mon);
      rangeEnd.setDate(rangeEnd.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);

      const cursor = new Date(mon);
      for (let i = 0; i < 7; i++) {
        const y = cursor.getFullYear();
        const m = pad(cursor.getMonth() + 1);
        const d = pad(cursor.getDate());
        keys.push(`${m}/${d}`);
        cursor.setDate(cursor.getDate() + 1);
      }

    } else {
      // ── 月维度：1日 → 最后一天，每天一桶 ──
      rangeStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
      const lastDay = rangeEnd.getDate();

      const y = rangeStart.getFullYear();
      const m = pad(rangeStart.getMonth() + 1);
      for (let d = 1; d <= lastDay; d++) {
        keys.push(`${m}/${pad(d)}`);
      }
    }

    const startTs = rangeStart.getTime();
    const endTs = rangeEnd.getTime();

    // 构建空桶
    const map = new Map();
    keys.forEach(k => map.set(k, []));

    // 订单入桶：只取范围内
    for (const order of orders) {
      const ts = order._ts;
      if (ts < startTs || ts > endTs) continue;

      const date = new Date(ts);
      let key;
      if (scale === 'day') {
        key = `${pad(date.getHours())}:00`;
      } else {
        key = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
      }

      if (map.has(key)) map.get(key).push(order);
    }

    // 平行计数数组
    const counts = keys.map(k => map.get(k).length);

    bucketMap.value = map;
    timeAxisKeys.value = keys;
    orderCountPerBucket.value = counts;
  }

  // ===== 公开方法 =====

  /** 拉取全量数据 */
  async function fetchAndPreprocess() {
    isLoading.value = true;
    error.value = null;
    try {
      const list = await getAnimationData();
      if (!list || !Array.isArray(list)) {
        throw new Error('animation-data 返回数据为空或格式错误');
      }

      const parsed = list
        .map(o => ({ ...o, _ts: new Date(o.publishTime).getTime() }))
        .filter(o => !isNaN(o._ts));

      rawOrders.value = parsed;
    } catch (e) {
      error.value = e.message || '数据加载失败';
      console.error('[useSpacetimePreprocess]', e);
    } finally {
      isLoading.value = false;
    }
  }

  /** 切换粒度 / 日期时重新分桶（不重新请求 API） */
  function recomputeBuckets(scale, selectedDate) {
    if (rawOrders.value.length === 0) return;
    buildBuckets(scale, selectedDate);
  }

  return {
    bucketMap,
    timeAxisKeys,
    orderCountPerBucket,
    rawOrders,
    isLoading,
    error,
    fetchAndPreprocess,
    recomputeBuckets
  };
}
