<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
});

const chartRef = ref(null);
let chartE = null;

onMounted(() => {
  chartE = echarts.init(chartRef.value);
  updateChart();
});

watch(() => props.data, () => updateChart(), { deep: true });

function updateChart() {
  if (!chartE || !props.data.length) return;
  chartE.setOption({
    title: { 
      text: '性别比例', 
      left: 'center', 
      top: '3%',
      textStyle: { fontSize: 12, color: '#1e3a8a' }
    },
    tooltip: { 
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    legend: {
      bottom: '3%',
      left: 'center',
      orient: 'horizontal',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 10, color: '#64748b' }
    },
    series: [{
      type: 'pie',
      radius: ['38%', '62%'],
      center: ['50%', '52%'],
      data: props.data.map(i => ({ name: i.name, value: i.value })),
      color: ['#3b82f6', '#f472b6'],
      label: { 
        show: true, 
        formatter: '{d}%', 
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
        position: 'inside'
      },
      labelLine: { show: false },
      emphasis: {
        itemStyle: {
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0,0,0,0.2)'
        }
      }
    }]
  }, true);
}

function resize() {
  chartE?.resize();
}

defineExpose({
  resize
});
</script>

<style scoped>

</style>
