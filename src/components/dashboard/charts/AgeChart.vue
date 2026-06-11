<template>
  <div ref="chartRef" class="chart-container"></div>    
</template>

<script setup>
import { ref, watch, onMounted} from 'vue';
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
})

watch(() => props.data, () => updateChart(), {deep: true});

function updateChart() {
    if(!chartE || !props.data.length) return;
    chartE.setOption({
        backgroundColor: 'transparent',
        title: { text:'年龄分布', left:'center', top:4, textStyle:{ fontSize:11, color:'#64748b', fontWeight:400 } },
        grid: { bottom:'10%', top:'18%', left:'5%', right:'5%', containLabel:true },
        tooltip: { trigger:'axis', backgroundColor:'rgba(15,23,42,0.95)', borderColor:'rgba(59,130,246,0.3)', textStyle:{ color:'#e2e8f0', fontSize:11 } },
        xAxis: { type:'category', data:props.data.map(i=>i.name), axisLabel:{ fontSize:9, color:'#64748b' }, axisLine:{ lineStyle:{ color:'rgba(255,255,255,0.06)' } }, axisTick:{ show:false } },
        yAxis: { type:'value', minInterval:1, axisLabel:{ fontSize:9, color:'#475569' }, splitLine:{ lineStyle:{ color:'rgba(255,255,255,0.04)', type:'dashed' } } },
        series:[{ type:'bar', data:props.data.map(i=>i.value), barWidth:'50%', itemStyle:{ color: new echarts.graphic.LinearGradient(0,0,0,1,[{ offset:0, color:'#38bdf8' },{ offset:1, color:'#0ea5e9' }]), borderRadius:[3,3,0,0] }, label:{ show:true, position:'top', fontSize:9, color:'#475569' } }]
    }, true)
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