<template>
  <transition name="slide">
    <div v-if="visible" class="detail-overlay" @click.self="$emit('close')">
      <div class="detail-side">
        <button class="close-btn" @click="$emit('close')">×</button>
        <div class="detail-content">
          <h2 class="detail-header">{{ item.rName }}</h2>
          <div class="detail-row">
            <label>联系电话</label>
            <span><a :href="`tel:${item.rPhone}`">{{ item.rPhone }}</a></span>
          </div>
          <div class="detail-row">
            <label>服务类型</label>
            <span class="highlight">{{ svcMap[item.serviceType] || '其他服务' }}</span>
          </div>
          <div class="detail-row">
            <label>任务状态</label>
            <span :class="item.status === '已完成' ? 'status-done' : 'status-doing'">{{ item.status }}</span>
          </div>
          <div class="detail-row">
            <label>发布时间</label>
            <span class="time-text">{{ formatTime(item.publishTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  item: { type: Object, default: () => ({}) }
});
defineEmits(['close']);

const svcMap = { 0: '基础照护', 1: '陪护服务', 2: '送餐服务', 3: '清洁服务', 4: '心理疏导' };

function formatTime(t) {
  if (!t) return '无';
  return new Date(t).toLocaleString();
}
</script>

<style scoped>
.detail-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
}
.detail-side {
  position: absolute; right: 20px; top: 70px; width: 300px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 10px; padding: 20px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}
.close-btn {
  position: absolute; top: 10px; right: 14px;
  background: none; border: none; color: #64748b; font-size: 20px; cursor: pointer;
}
.close-btn:hover { color: #f87171; }
.detail-header {
  font-size: 16px; color: #e2e8f0; margin-bottom: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2); padding-bottom: 8px;
}
.detail-row { display: flex; flex-direction: column; margin-bottom: 10px; font-size: 13px; color: #cbd5e1; }
.detail-row label { color: #64748b; font-size: 10px; letter-spacing: 1px; }
.highlight { color: #38bdf8; font-weight: bold; }
.status-done { color: #10b981; font-weight: bold; }
.status-doing { color: #f59e0b; font-weight: bold; }
.time-text { color: #94a3b8; }
a { color: #60a5fa; text-decoration: none; }

.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(30px); opacity: 0; }
</style>