<template>
  <div class="pb">
    <!-- 播放按钮 -->
    <button class="pb-btn" @click="$emit('play')" :disabled="isPlaying">
      {{ isPlaying ? '⏸' : '▶' }}
    </button>

    <!-- 时间轴 -->
    <div class="pb-track">
      <div class="pb-fill" :style="{ width: playProgress + '%' }"></div>
      <div class="pb-ticks">
        <span v-for="t in timeAxisTicks" :key="t">{{ t }}</span>
      </div>
    </div>

    <!-- 当前时间 -->
    <span class="pb-time">{{ currentTimeDisplay || '--:--' }}</span>

    <!-- 缩放切换 -->
    <div class="pb-tabs">
      <button v-for="(label, key) in scaleMap" :key="key" :class="{ on: currentScale === key }" @click="$emit('change-scale', key)">{{ label }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ isPlaying:Boolean, playProgress:Number, currentTimeDisplay:String, timeAxisTicks:Array, currentScale:String, scaleMap:Object });
defineEmits(['play','change-scale']);
</script>

<style scoped>
.pb { display: flex; align-items: center; gap: 12px; width: 100%; }

/* 播放按钮 */
.pb-btn {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(56,189,248,0.3);
  background: rgba(56,189,248,0.1); color: #38bdf8; font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s; flex-shrink: 0;
}
.pb-btn:hover:not(:disabled) { background: rgba(56,189,248,0.2); transform: scale(1.08); }
.pb-btn:disabled { opacity: 0.3; cursor: default; }

/* 时间轴 */
.pb-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; position: relative; }
.pb-fill {
  height: 100%; background: linear-gradient(90deg, rgba(56,189,248,0.4), #38bdf8);
  border-radius: 2px; transition: width 0.15s linear; position: relative; z-index: 1;
}
.pb-ticks {
  position: absolute; top: 8px; width: 100%; display: flex; justify-content: space-between;
  font-size: 9px; color: #475569; z-index: 0;
}

/* 时间 */
.pb-time {
  font-family: "Orbitron","Courier New",monospace; font-size: 14px; font-weight: 600;
  color: #38bdf8; min-width: 50px; text-align: center; flex-shrink: 0;
}

/* 缩放 */
.pb-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 2px; flex-shrink: 0; }
.pb-tabs button {
  background: transparent; border: none; color: #64748b; font-size: 11px;
  padding: 3px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s;
}
.pb-tabs button.on { background: rgba(56,189,248,0.15); color: #38bdf8; }
.pb-tabs button:hover:not(.on) { color: #94a3b8; }
</style>