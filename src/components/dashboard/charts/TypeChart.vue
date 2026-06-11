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

// 直接替换这段 updateChart 函数
function updateChart() {
  if (!chartE || !props.data.length) return;
  
  chartE.setOption({
    title: {
      text: '服务类型占比',
      left: 'center',
      top: '2%',
      textStyle: { fontSize: 12, color: '#1e3a8a' }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}单 ({d}%)'
    },
    legend: {
      bottom: '2%',
      left: 'center',
      orient: 'horizontal',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 10, color: '#64748b' }
    },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '50%'],
      data: props.data.map(i => ({ name: i.name, value: i.value })),
      label: { 
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: '#475569',
        overflow: 'truncate',
        width: 50
      },
      labelLine: {
        length: 8,
        length2: 6,
        smooth: true
      },
      emphasis: {
        label: { fontSize: 12, fontWeight: 'bold' }
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
