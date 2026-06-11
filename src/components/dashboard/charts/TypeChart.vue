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
    backgroundColor: 'transparent',
    title: { text:'服务类型', left:'center', top:4, textStyle:{ fontSize:11, color:'#64748b', fontWeight:400 } },
    tooltip: { trigger:'item', backgroundColor:'rgba(15,23,42,0.95)', borderColor:'rgba(59,130,246,0.3)', textStyle:{ color:'#e2e8f0', fontSize:11 } },
    legend: { bottom:'2%', left:'center', itemWidth:6, itemHeight:6, textStyle:{ fontSize:9, color:'#64748b' } },
    series: [{ type:'pie', radius:['35%','60%'], center:['50%','50%'], data:props.data.map(i=>({ name:i.name, value:i.value })), color:['#38bdf8','#10b981','#f59e0b','#a78bfa','#f472b6'], label:{ show:true, position:'outside', formatter:'{b} {d}%', fontSize:9, color:'#94a3b8' }, labelLine:{ length:8, length2:6, smooth:true, lineStyle:{ color:'rgba(255,255,255,0.1)' } } }]
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
