<template>
  <header class="header-nav">
    <router-link to="/dashboard" class="logo-title">
      南昌市居家养老资源时空分析决策平台
    </router-link>
    
    <div class="nav-group">
      <button 
        class="analysis-btn" 
        :class="{ active: currentPath === '/coverage' }"
        @click="navTo('/coverage')"
      >
        <span class="icon">🌐</span> 设施覆盖评价
      </button>

      <button 
        class="analysis-btn" 
        :class="{ active: currentPath === '/route' }"
        @click="navTo('/route')"
      >
        <span class="icon">🚀</span> 适老化路径规划
      </button>
    </div>

    <div class="header-right">
      <div class="live-clock">{{ currentTime }}</div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 获取当前路由路径，用于高亮按钮
const currentPath = computed(() => route.path);

// 路由跳转方法
const navTo = (path) => {
  router.push(path);
};

// 实时时间逻辑
const currentTime = ref('');
let timer = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.header-nav {
  height: 64px;
  background: linear-gradient(to bottom, #0f172a, rgba(15, 23, 42, 0.95));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.logo-title {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  letter-spacing: 2px;
  cursor: pointer;
  text-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
  transition: all 0.3s ease;
}

.logo-title:hover {
  color: #60a5fa;
}

.nav-group {
  display: flex;
  gap: 20px;
}

.analysis-btn {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #94a3b8;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.analysis-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #fff;
}

.analysis-btn.active {
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.1));
  border-color: #3b82f6;
  color: #fff;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}

.live-clock {
  color: #60a5fa;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}
</style>