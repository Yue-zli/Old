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
        title: {
            text:'年龄分布统计',
            left:'center',
            top: '2%',
            textStyle: {
                fontSize: 12,
                color: '#1e3a8a'
            }
        },
        grid: {
            bottom: '12%',
            top: '22%',
            left: '8%',
            right: '5%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            formatter: '{b}: {c}人'
        },
        xAxis: {
            type:'category',
            data: props.data.map(i => i.name),
            axisLabel: {
                fontSize: 10,
                color: '#64748b',
                interval: 0
            },
            axisLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis:{
            type: 'value',
            minInterval: 1,
            axisLabel: { fontSize: 10, color: '#64748b' },
            splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        series:[{
            type:'bar',
            data: props.data.map(i => i.value),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#60a5fa' },
                    { offset: 1, color: '#3b82f6' }
                ]),
                borderRadius: [3, 3, 0, 0]
            },
            barWidth: '50%',
            label: {
                show: true,
                position: 'top',
                fontSize: 10,
                color: '#475569'
            }
        }]
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