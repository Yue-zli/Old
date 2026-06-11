<template>
  <div class="playback-panel">
      <div class="playback-header">
          <span class="play-status">{{ isPlaying ? '正在回放...' : '准备回放' }}</span>
          <div class="playback-tabs">
            <button
              v-for="(label,key) in scaleMap"
              :key="key"
              :class="{ active: currentScale === key  }"
              @click="$emit('change-scale', key)"
            >
              {{ label }}
            </button>
          </div>
          <span class="current-time-text">{{ currentTimeDisplay || '---' }}</span>
      </div>

      <div class="axis-container">
        <button class="play-main-btn" @click="$emit('play')" :disabled="isPlaying">
          <span v-if="!isPlaying">▶</span>
          <span v-else class="loading-spinner"></span>
        </button>

        <div class="timeline-track">
          <div class="progress-bar" :style="{width: playProgress + '%'}"></div>
          <div class="axis-ticks">
            <span v-for="tick in timeAxisTicks" :key="tick" class="tick-item">
            {{ tick }}
            </span>
          </div>
        </div>
     </div>
  </div>
</template>

<script setup>
//接收父组件传来的状态
defineProps({
    isPlaying: Boolean,
    playProgress: Number,
    currentTimeDisplay:String,
    timeAxisTicks: Array,
    currentScale: String,
    scaleMap: Object
});

defineEmits(['play', 'change-scale']);
</script>

<style scoped>
.playback-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(15,23,42,0.9);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  padding: 12px 20px;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.playback-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.play-status {
  color: #94a3b8;
  font-size: 12px;
}

.current-time-text {
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 14px;
}

.axis-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.play-main-btn {
  width: 40px;
  height: 40px;
  height: 40px;
  border-radius: 50%;
  border:none;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s;

}

.play-main-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background: #2563eb;
}

.play-main-btn:disabled {
  background: #475569;
}

.timeline-track {
  flex: 1;
  height: 6px;
  background: #334155;
  border-radius: 3px;
  position: relative;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.axis-ticks {
  position: absolute;
  top: 12px;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.tick-item {
  color: #64748b;
  font-size: 10px;
}

/* 简单的加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.playback-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px;
  border-radius: 4px;
}

.playback-tabs button {
  padding: 2px 12px;
  font-size: 11px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s;
}

.playback-tabs button.active {
  background: #3b82f6;
  color: white;
  border-radius: 2px;
}

.playback-tabs button:hover:not(.active) {
  color: #fff;
}
</style>