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
    backgroundColor: 'transparent',
    title: { text:'性别比例', left:'center', top:4, textStyle:{ fontSize:11, color:'#64748b', fontWeight:400 } },
    tooltip: { trigger:'item', backgroundColor:'rgba(15,23,42,0.95)', borderColor:'rgba(59,130,246,0.3)', textStyle:{ color:'#e2e8f0', fontSize:11 } },
    legend: { bottom:'2%', left:'center', itemWidth:6, itemHeight:6, textStyle:{ fontSize:9, color:'#64748b' } },
    series: [{ type:'pie', radius:['40%','62%'], center:['50%','53%'], data:props.data.map(i=>({ name:i.name, value:i.value })), color:['#38bdf8','#f472b6'], label:{ show:true, formatter:'{d}%', fontSize:12, fontWeight:'bold', color:'#e2e8f0', position:'inside' }, labelLine:{ show:false }, emphasis:{ itemStyle:{ shadowBlur:10, shadowColor:'rgba(56,189,248,0.3)' } } }]
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
