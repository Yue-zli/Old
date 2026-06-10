import { ref, onBeforeUnmount } from 'vue';
import * as echarts from  "echarts";

export function useDashboardCharts() {
    const ageChartRef = ref(null);
    const genderChartRef = ref(null);
    const typeChartRef = ref(null);
    const hourChartRef = ref(null);
    
    let charts = { age: null, gender: null, type: null, hour: null};

    //初始化某个图表
    const initChart = (elRef, option, key) => {
        if(!elRef) return;
        if(charts[key]) charts[key].dispose();
        charts[key] = echarts.init(elRef);
        charts[key].setOption(option);
    }
    const resizeAll = () => {
        Object.values(charts).forEach(instance => instance?.resize());
    };

    onBeforeUnmount(() => {
        Object.values(charts).forEach(instance => instance?.dispose());
    })

    return {
        ageChartRef,
        genderChartRef,
        typeChartRef,
        hourChartRef,
        initChart,
        resizeAll
    };
}