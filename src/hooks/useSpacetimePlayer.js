// useSpacetimePlayer.js — 4D 时空漫游：播放引擎（定时器 + 状态机）
// 接收预处理好的 bucketMap + timeAxisKeys，驱动逐帧播放
// 自动计算拖尾数据（当前帧 + 前 N 帧合并，按 opacity 分层）
import { ref, computed } from 'vue';

export function useSpacetimePlayer(bucketMap, timeAxisKeys, speedMs) {
  // ===== 核心状态 =====
  const isPlaying = ref(false);
  const currentIndex = ref(0);
  let intervalId = null;

  // ===== Computed =====

  /** 当前帧对应的桶 key */
  const currentBucketKey = computed(() => {
    if (!timeAxisKeys.value || timeAxisKeys.value.length === 0) return null;
    return timeAxisKeys.value[currentIndex.value] ?? null;
  });

  /** 当前帧的订单列表（O(1) Map 查找） */
  const currentBucketOrders = computed(() => {
    const key = currentBucketKey.value;
    if (!key || !bucketMap.value) return [];
    return bucketMap.value.get(key) || [];
  });

  /** 播放进度 0-100 */
  const playProgress = computed(() => {
    const len = timeAxisKeys.value.length;
    if (len <= 1) return 0;
    return Math.round((currentIndex.value / (len - 1)) * 100);
  });

  /** 当前时间标签（人类可读） */
  const currentTimeLabel = computed(() => {
    return currentBucketKey.value || '--';
  });

  // ===== 拖尾数据 =====
  // 合并当前帧 + 前 2 帧，每帧赋予不同 opacity
  // 相同坐标去重，保留最高 opacity
  const TRAIL_FRAMES = 2;
  const OPACITY_MAP = [1.0, 0.5, 0.2]; // 帧N, N-1, N-2

  const trailingData = computed(() => {
    const keys = timeAxisKeys.value;
    const map = bucketMap.value;
    if (!keys || keys.length === 0 || !map) return [];

    const result = [];
    const dedup = new Map(); // coordKey → { lng, lat, opacity, raw }

    for (let offset = 0; offset <= TRAIL_FRAMES; offset++) {
      const frameIdx = currentIndex.value - offset;
      if (frameIdx < 0) continue;

      const bucketKey = keys[frameIdx];
      const orders = map.get(bucketKey);
      if (!orders || orders.length === 0) continue;

      const opacity = OPACITY_MAP[offset] ?? 0.2;

      for (const order of orders) {
        const lng = parseFloat(order.rLng || order.r_lng || 0);
        const lat = parseFloat(order.rLat || order.r_lat || 0);
        if (!lng || !lat) continue;

        const coordKey = `${lng.toFixed(6)},${lat.toFixed(6)}`;
        const existing = dedup.get(coordKey);
        if (!existing || existing.opacity < opacity) {
          dedup.set(coordKey, { lng, lat, opacity, raw: order });
        }
      }
    }

    return [...dedup.values()];
  });

  // ===== 控制方法 =====
  const spd = speedMs || ref(800);

  function play() {
    if (timeAxisKeys.value.length === 0) return;
    // 若已在末尾，从头开始
    if (currentIndex.value >= timeAxisKeys.value.length - 1) {
      currentIndex.value = 0;
    }
    isPlaying.value = true;
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      currentIndex.value++;
      if (currentIndex.value >= timeAxisKeys.value.length - 1) {
        // 到达最后一帧
        pause();
        currentIndex.value = timeAxisKeys.value.length - 1; // 停在最后一帧
      }
    }, spd.value);
  }

  function pause() {
    isPlaying.value = false;
    clearInterval(intervalId);
    intervalId = null;
  }

  function stop() {
    pause();
    currentIndex.value = 0;
  }

  function seek(index) {
    // 安全边界
    const len = timeAxisKeys.value.length;
    if (len === 0) return;
    const clamped = Math.max(0, Math.min(len - 1, index));
    currentIndex.value = clamped;
  }

  function setSpeed(ms) {
    spd.value = Math.max(100, Math.min(5000, ms)); // 限制 100ms ~ 5s
    if (isPlaying.value) {
      // 重启定时器以应用新速度
      pause();
      play();
    }
  }

  return {
    // 状态
    isPlaying,
    currentIndex,
    currentBucketKey,
    currentBucketOrders,
    playProgress,
    currentTimeLabel,
    trailingData,
    // 控制
    play,
    pause,
    stop,
    seek,
    setSpeed
  };
}
