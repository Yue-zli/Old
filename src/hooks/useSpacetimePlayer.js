// TODO: 4D 时空漫游 — 播放引擎（定时器 + 状态机）
// 提示：
// 1. 接收 bucketMap + timeAxisKeys + speedMs
// 2. 状态机：IDLE → PLAYING → PAUSED → FINISHED
// 3. setInterval 推进 currentIndex，到达末尾自动暂停
// 4. trailingData computed：合并当前帧 + 前2帧，opacity 1.0/0.5/0.2 去重
// 5. 暴露 play/pause/stop/seek/setSpeed
import{ ref, computed } from 'vue';

export function useSpacetimePlayer(bucketMap, timeAxisKeys, speedMs) {
    const isPlaying = ref(false);
    const currentIndex = ref(0);
    let intervalId = null;

    //当前帧对应的桶
    const currentBucketKey = computed(() => {
        const keys = timeAxisKeys.value;
        if(!keys || keys.length === 0) return null;
        return keys[currentIndex.value] ?? null;
    });
    
    //当前帧的订单列表
    const currentBucketOrders = computed (() => {
        const key = currentBucketKey.value;
        if (!key || !bucketMap.value) return [];
        return bucketMap.value.get(key) || [];
    });

    const playProgress = computed(() => {
        const len = timeAxisKeys.value.length;
        if(len <= 1) return 0;
        return Math.round((currentIndex.value / (len-1))* 100);

    });

    const currentTimeLabel = computed (() => currentBucketKey.value || '--');
    const trailingData = computed(() => {
        const keys = timeAxisKeys.value;
        const map = bucketMap.value;
        if(!keys || keys.length === 0 ||!map) return [];

        const dedup = new Map();
        const opacityMap = [1.0 ,0.5, 0.2];
        
        //显示多帧订单，展示订单演变过程
        for (let offset = 0; offset <3; offset++) {
            const idx = currentIndex.value -offset;
            if (idx<0) continue;

            const bucketKey = keys[idx];
            const orders = map.get(bucketKey);
            if (!orders) continue;

            const opacity = opacityMap[offset];
            for (const o of orders) {
                const lng = parseFloat(o.rLng || 0);
                const lat = parseFloat(o.rLat || 0);
                if (!lng || ! lat) continue;

                const ck = `${lng.toFixed(6)},${lat.toFixed(6)}`;
                const exist = dedup.get(ck);
                if( !exist || exist.opacity < opacity) {
                    dedup.set(ck, { lng,lat,opacity,raw:o});
                }
            }

        }
        return [...dedup.values()];
    });


    //===控制方法====
    const spd = speedMs || ref(800);
    function play() {
        if (timeAxisKeys.value.length === 0) return;
        if (currentIndex.value >= timeAxisKeys.value.length - 1) {
            currentIndex.value = 0;
        }
        isPlaying.value = true;
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            currentIndex.value++;
            if (currentIndex.value >= timeAxisKeys.value.length - 1) {
                pause();
                currentIndex.value = timeAxisKeys.value.length - 1;
            }
        }, spd.value);
    }

    function pause() {
        isPlaying.value=false;
        clearInterval(intervalId);
        intervalId = null;
    }

    function stop() {
        pause();
        currentIndex.value=0;
    }

    function seek(index) {
        const len = timeAxisKeys.value.length;
        if (len === 0) return;
        currentIndex.value = Math.max(0, Math.min(len - 1, index));
    }

    function setSpeed(ms) {
        spd.value = Math.max(100, Math.min(5000, ms)); //100ms-5s
        if( isPlaying.value ) {
            pause();
            play();
        }
    }

    return {isPlaying, currentIndex, currentBucketKey, playProgress, currentTimeLabel, trailingData,
    play, pause, stop, seek, setSpeed}
}