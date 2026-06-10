<template>
    <div class="cards">
        <div class="card" v-for="item in cardConfig" :key="item.label">
            <span class="card-label">{{ item.label }}</span>
            <div class="card-value">{{ item.value }}</div>
            <div class="card-line"></div> </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
    ordersCount: Number,
    managersCount: Number,
    volunteersCount: Number,
});

const cardConfig = computed(() => [
    { label: '需求单量', value: props.ordersCount },
    { label: '在岗管理', value: props.managersCount },
    { label: '注册志愿', value: props.volunteersCount }
]);
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 5px;
}

.card {
  /* 玻璃拟态：深色渐变 + 模糊 */
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  /* 关键：半透明蓝色边框 */
  border: 1px solid rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
}

/* 装饰线条：模仿科技感边角 */
.card::before {
  content: "";
  position: absolute;
  top: 0; left: 0;
  width: 6px; height: 6px;
  border-top: 2px solid #3b82f6;
  border-left: 2px solid #3b82f6;
}

.card-label { 
  display: block;
  font-size: 11px; 
  color: #94a3b8; 
  margin-bottom: 4px;
}

.card-value { 
  font-size: 24px; 
  font-weight: bold; 
  color: #3b82f6; 
  /* 增加文字发光 */
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); 
}
</style>