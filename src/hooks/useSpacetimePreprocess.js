// TODO: 4D 时空漫游 — 时间桶预处理引擎
// 提示：
// 1. 用 getAnimationData() 拉取全量订单
// 2. 解析 publishTime 为时间戳
// 3. 根据 selectedDate + scale(day/week/month) 生成连续时间轴 keys
// 4. 将订单分入对应桶，构建 Map<key, orders[]>
// 5. recomputeBuckets() 切换粒度时不重新请求 API
import { ref } from 'vue';
import { getAnimationData } from '../api/stat.js';

export function useSpacetimePreprocess() {
    const bucketMap = ref(new Map());
    const timeAxisKeys = ref([]);

    const orderCountPerBucket = ref([]);
    const rawOrders = ref([]);
    const isLoading = ref(false);
    const error = ref(null);


    function pad(n) {
        return String(n).padStart(2,'0');
    }

    function getMonday(date) {
        const d = new Date(date);
        const day = d.getDay() || 7;  //把周日从0变成7
        d.setDate(date.getDate()-day+1);
        d.setHours(0,0,0,0);
        return d;
    }

    //把Date转成桶的key字符串
    function formatKey(date, scale) {
        if (scale === 'day') {
            //日维度： 取小时 “06：00”
            return `${pad(date.getHours())}:00`;
        }
        if (scale === 'month') {
            // 月维度：归到该日期所在周的周一
            const d = new Date(date);
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - day + 1);
            return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
        }
        // 周维度
        return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

    }

    function buildBuckets(scale, selectedDate) {
        const orders = rawOrders.value;
        if(!orders || orders.length ===0) {
            bucketMap.value = new Map();
            timeAxisKeys.value = [];
            orderCountPerBucket.value=[];
            return;
        }

        const base = new Date(selectedDate);
        let rangeStart, rangeEnd, keys =[];
        
        //确定时间范围生成key列表
        if(scale === 'day') {
            //日 24个桶
            rangeStart = new Date(base);
            rangeStart.setHours(0,0,0,0);
            rangeEnd=new Date(base);
            rangeEnd.setHours(23,59,59,999);
            for(let h =0;h<24;h++) {
                keys.push(`${pad(h)}:00`);
            }
        } else if (scale === 'week') {
            //周 7个桶
            const mon = getMonday(base);
            rangeStart = new Date(mon);
            rangeEnd = new  Date(mon);
            rangeEnd.setDate(rangeEnd.getDate() + 6);
            rangeEnd.setHours(23,59,59,999);
            const cursor = new Date(mon);
            for(let i =0;i<7;i++) {
                keys.push(`${cursor.getMonth()+1}/${pad(cursor.getDate())}`);
                cursor.setDate(cursor.getDate()+1);
            }
        } else {
            // 月维度：近三个月，按周切分（约 12-14 帧）
            rangeStart = new Date(base.getFullYear(), base.getMonth() - 2, 1, 0, 0, 0, 0);
            rangeEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
            const cursor = getMonday(rangeStart);  // 从周一对齐开始
            while (cursor <= rangeEnd) {
                keys.push(`${pad(cursor.getMonth() + 1)}/${pad(cursor.getDate())}`);
                cursor.setDate(cursor.getDate() + 7);
            }
        }

        //构建空桶
        const map =new Map();
        keys.forEach(k=>map.set(k,[]));

        //订单入桶
        const startTs = rangeStart.getTime();
        const endTs = rangeEnd.getTime();
        for (const order of orders) {
            const ts = order._ts;
            if(ts<startTs || ts>endTs) continue;
            const key = formatKey(new Date(ts), scale);
            if(map.has(key)) map.get(key).push(order);
        }
        bucketMap.value = map;
        timeAxisKeys.value = keys;
        orderCountPerBucket.value = keys.map(k => map.get(k).length);
        console.log('[分桶]', scale, '共', keys.length, '帧, keys:', keys,
          '订单总数:', keys.reduce((s,k) => s + map.get(k).length, 0));
    }

    async function fetchAndPreprocess() {
        isLoading.value = true;
        error.value = null;
        try{
            const list = await getAnimationData();
            if (!list || !Array.isArray(list)) {
            throw new Error('animation-data 返回数据为空');
            }
            const parsed =list.map(o => ({...o,_ts: new Date(o.publishTime).getTime()}))
            .filter(o=>!isNaN(o._ts));
            rawOrders.value = parsed;
        } catch (e) {
            error.value = e.message || '数据加载失败';
        } finally {
            isLoading.value = false;
        }
    }

    function recomputeBuckets(scale, selectedDate) {
        if (rawOrders.value.length === 0) return;
        buildBuckets(scale, selectedDate);
    }

    return {
        bucketMap, timeAxisKeys, orderCountPerBucket,
        rawOrders,isLoading,error,
        fetchAndPreprocess,recomputeBuckets
    };

}