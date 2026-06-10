import { ref, computed } from 'vue';

export function usePlayback(orders, heatmap, currentScale,selectedDate) {
    const displayOrders = ref([]); // 传给地图过滤后的数据
    const isPlaying = ref(false);
    const playProgress = ref(0);
    const currentTimeDisplay = ref('');
    let timer = null;

    const rawOrders = ref([]);  // 排序后的全量数据
    let currentFrame = 0;
    let totalFrames = 100;

    // 根据当前scale动态生成刻度单位
    const timeAxisTicks = computed(() => {
        if (currentScale.value === 'day') return ['00:00', '06:00', '12:00', '18:00', '23:59'];
        if (currentScale.value === 'week') return ['周一','周二','周三','周四','周五','周六','周日'];
        if (currentScale.value === 'month') return ['1日', '10日', '20日', '30日'];
        return ['开始', '结束'];
    });

    function initDisplayOrders() {
        if(!orders.value||orders.value.length === 0) return;

        rawOrders.value =[...orders.value].sort(
            (a,b) => new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime()
        );

        displayOrders.value=orders.value;
        playProgress.value=0;
        currentTimeDisplay.value='准备就绪';
        currentFrame=0;
        if (timer) clearInterval(timer);

    }
    
    // 格式化时间显示，根据维度
    function formatDisplayTime(timestamp) {
        const date = new Date(timestamp);
        if(currentScale.value === 'day') {
            return date.toLocaleTimeString([],{ hour: '2-digit', minute: '2-digit'});
        }
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:00`;
    }

    //播放函数
    async function startMapPlayback() {
        if (isPlaying.value || orders.value.length === 0) return;

        isPlaying.value = true;
        heatmap.value = true;
        
        let startTime,endTime;
        const baseDate = new Date(selectedDate.value);

        if(currentScale.value === 'day') {
        //日维度：固定当天的0点到24点
            startTime = new Date(baseDate.setHours(0,0,0,0)).getTime();
            endTime = new Date(baseDate.setHours(23,59,59,999)).getTime();
        } else if (currentScale.value === 'week') {
            //周维度，计算本周一到周日
            const day = baseDate.getDay() || 7;
            //monday
            const mon = new Date(baseDate.setDate(baseDate.getDate()-day +1))
            //sunday
            startTime = new Date(mon.setHours(0,0,0,0)).getTime();
            const sun = new Date(mon.setDate(mon.getDate()+6));
            endTime = new Date(sun.setHours(23,59,59,999)).getTime();
        } else {
            startTime = new Date(baseDate.getFullYear(), baseDate.getMonth(),1).getTime();
            endTime=new Date(baseDate.getFullYear(), baseDate.getMonth()+1,0,23,59,59)
        }
        const totalDuration = endTime - startTime;
        currentFrame = 0;

        if(timer) clearInterval(timer);

        timer = setInterval(()=> {
           if (currentFrame > totalFrames){
            stopPlayback();
            return;
           }
                   //计算当前帧代表的时间戳
        const currentTimestamp = startTime + (totalDuration*(currentFrame/totalFrames));
        currentTimeDisplay.value = formatDisplayTime(currentTimestamp);

        //“热力窗口”大小
        //播放时只显示这个时间段内的数据
        let windowSize = 3600000; //默认1h
        if(currentScale.value === 'week') windowSize = 3600000*6;
        if(currentScale.value === 'month') windowSize = 36000000*24;
        displayOrders.value=rawOrders.value.filter(item=> {
            const itemTime = new Date(item.publishTime).getTime();
            return itemTime <= currentTimestamp && itemTime >= (
                currentTimestamp - windowSize
            );
        });

        playProgress.value = (currentFrame/totalFrames) * 100;
        currentFrame++;
        },150)


    }

    function stopPlayback() {
        if (timer) clearInterval(timer);
        isPlaying.value = false;
        playProgress.value = 0;
        currentFrame = 0
        displayOrders.value = orders.value;
        currentTimeDisplay.value='播放结束'
    }

    /** 拖动进度条跳转 */
    function seekToPercent(percent) {
        if (!rawOrders.value.length) return;

        const startTime = new Date(rawOrders.value[0].publishTime).getTime();
        const endTime = new Date(rawOrders.value[rawOrders.value.length - 1].publishTime).getTime();
        const currentTimestamp = startTime + (percent / 100) * (endTime - startTime);

        currentFrame = Math.floor((percent / 100) * totalFrames);
        playProgress.value = percent;
        currentTimeDisplay.value = formatDisplayTime(currentTimestamp);

        displayOrders.value = rawOrders.value.filter(
            item => new Date(item.publishTime).getTime() <= currentTimestamp
        );
    }

    return {
        displayOrders,
        isPlaying,
        playProgress,
        currentTimeDisplay,
        timeAxisTicks,
        startMapPlayback,
        stopPlayback,
        initDisplayOrders,
        seekToPercent
    };
}
