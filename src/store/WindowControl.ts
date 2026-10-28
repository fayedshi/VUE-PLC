import { reactive, computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http from '../../api/http';

// 1. 基础状态定义
interface WindowState {
    id: number;
    index: number;
    action: 'open' | 'close' | 'stop' | null;
    status: number; // 比如：'opened', 'closed', 'moving'
}

interface FanState {
    id: number;
    index: number;
    action: 'open' | 'close' | 'stop' | null;
    status: number;
}

interface BlowerState {
    id: number;
    index: number;
    action: 'forward' | 'reverse' | 'stop' | null;
    status: number;
}
interface AcState {
    id: number;
    index: number;
    action: 'open' | 'stop' | null;
    status: number;
}
const fanMap = ref<Map<number, number>>(new Map())
const blowerMap = ref<Map<number, number>>(new Map())
const devStatesObj = ref({
    // 'switch': [], 'windows': [], 'blowers': [], 'fans': [], 'ac': []
})
const controlMode = ref()
export const useWindowControlStore = defineStore('windowControl', () => {
    // --- 模拟解析 YAML 配置 ---
    let config = {
        // windows: { start: 1, end: 18 },
        // fanWindow: { src: [2, 4, 6, 10], target_start: 27 },
        // blowerWindow: { src_start: 11, src_end: 18, target_start: 19 }
    }
    const loading = ref(false)

    // 初始化/获取后端配置与数据的核心方法
    const initDeviceConfig = async () => {
        loading.value = true
        try {
            // 1. 从后端获取配置 (后端可以直接返回 JSON 化的 YAML 配置以及当前设备状态)
            const response = await http.get('http-api/api/dev-address/001')
            console.log('config:', response)
            config = response.data

            // 2. 动态解析映射规则
            const fMap = new Map<number, number>()
            if (config.fanWindow) {
                config.fanWindow.src.forEach((winId: number, index: number) => {
                    fMap.set(winId, config.fanWindow.target_start + index)
                })
                fanMap.value = fMap
            }
            console.log('fanMap', fanMap)

            const bMap = new Map<number, number>()
            for (let winId = config.blowerWindow.src_start; winId <= config.blowerWindow.src_end; winId++) {
                const index = winId - config.blowerWindow.src_start
                bMap.set(winId, config.blowerWindow.target_start + index)
            }
            blowerMap.value = bMap

            // 3. 灌入后端返回的实时状态 (status)
            // 假设后端返回的 currentStatus 结构为 { windows: {...}, fans: {...}, blowers: {...} }
            // Object.assign(windows, currentStatus.windows)
            // Object.assign(fans, currentStatus.fans)
            // Object.assign(blowers, currentStatus.blowers)

            // 初始化所有设备状态
            let fanIndex = 1
            let blowerIndex = 1
            let windowIndex = 1
            let damperStart = false
            for (let i = config.windows[0]; i <= config.windows[1]; i++) {
                if (fanMap.value.has(i)) {
                    const fanId = fanMap.value.get(i)!
                    fans[fanId] = { id: fanId, index: fanIndex++, action: null, status: -1 }
                }

                if (blowerMap.value.has(i)) {
                    if (!damperStart) {
                        windowIndex = 1
                        damperStart = true
                    }
                    const blowerId = blowerMap.value.get(i)!
                    blowers[blowerId] = { id: blowerId, index: blowerIndex++, action: null, status: -1 }
                }
                windows[i] = { id: i, index: windowIndex++, action: null, status: -1 }
            }

            let j=1;
            for (let i = config.ac[0]; i <= config.ac[1]; i++) {
                acs[i] = { id: i, index: j++, action: null, status: -1 }
            }
            console.log('acs', acs)
        } catch (error) {
            console.error('加载窗控配置失败:', error)
        } finally {
            loading.value = false
        }
    }

    const initWebSocket = () => {
        // todo: need granary switch control in ui, hardcode 001 for now
        let isExplicitlyClosed = false
        let socket = new WebSocket(`ws-api/ws/dev-state/001`);
        // socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);

        // 连接成功事件
        socket.onopen = () => {
            console.log('成功连接到 Python 后端 WebSocket！');
        };

        // 接收到后端实时数据事件
        socket.onmessage = (event: any) => {
            // 解析后端传过来的 JSON 字符串
            devStatesObj.value = JSON.parse(event.data);
            // console.log('3. 解析后的类型:', Array.isArray(allStates) ? '数组' : typeof allStates)
            // devStatesObj.value = allStates.splice(2);
            // controlStates.value = allStates.splice(0, 2);
            console.log('devstate', event.data)
            controlMode.value = devStatesObj.value['switch'][0]
            updateStatus()
            // runMode.value = devStatesObj.value.control[1]
            
            // console.log('controlStates', controlStates.value)
        };

        // 连接关闭事件
        socket.onclose = () => {
            // console.log('【前端提示】连接已断开，3秒后尝试自动重连...');
            if (!isExplicitlyClosed)
                setTimeout(initWebSocket, 3000); // 掉线自动重连机制
        };

        // 发生错误事件
        socket.onerror = (error) => {
            console.error('【前端提示】WebSocket 发生错误:', error);
        };
    };



    // --- 响应式状态定义 ---, key, value键值对类型
    const windows = reactive<Record<number, WindowState>>({})
    const fans = reactive<Record<number, FanState>>({})
    const blowers = reactive<Record<number, BlowerState>>({})
    const acs = reactive<Record<number, AcState>>({})


    const updateStatus = () => {
        Object.keys(windows).map(Number).map(winId => {
            const fanId = fanMap.value.get(winId) as number
            const blowerId = blowerMap.value.get(winId) as number
            if (Object.keys(devStatesObj.value).length > 0) {
                // 必须注意，这个winId一定要从1开始，否则跟index对不上
                windows[winId].status = devStatesObj.value.windows[winId - 1]
                // console.log('insde windowlist', windows[winId].status, 'fan ', fans[fanId])
                if (fans[fanId]) {
                    fans[fanId].status = devStatesObj.value.fans[fans[fanId].index - 1]
                }
                if (blowers[blowerId]) {
                    blowers[blowerId].status = devStatesObj.value.blowers[blowers[blowerId].index - 1]
                }
            }
        })
        Object.keys(acs).map(Number).map(acId => {
            if (Object.keys(devStatesObj.value).length > 0) {
                acs[acId].status = devStatesObj.value.ac[acs[acId].index - 1]
            }
        })
    }

    // --- 聚合的计算属性：供页面循环渲染使用 ---
    const windowList = computed(() => {
        let list = Object.keys(windows).map(Number).map(winId => {
            const fanId = fanMap.value.get(winId) as number
            const blowerId = blowerMap.value.get(winId) as number
            return {
                id: winId,
                window: windows[winId],
                fan: fanId ? fans[fanId] : null,
                blower: blowerId ? blowers[blowerId] : null,
                label: blowerId ? '门' : '窗' 
            }
        })

        console.log('windowList', list)
        return list
    })

    const acList = computed(() => {
        return Object.keys(acs).map(Number).map(acId => {
            return {
                id: acId,
                ac: acs[acId],
                label: '空调'
            }
        })
    })


    // --- 控制动作 (对接后端 API / Mqtt) ---
    const controlDevice = async (type: 'window' | 'fan' | 'blower', id: number, action: string) => {
        console.log(`发送指令: 设备类型[${type}], 设备ID[${id}], 动作[${action}]`)
        // 发送网络请求...
        // axios.post('/api/control', { type, id, action })
    }

    return { loading, windowList, acList, controlMode, initDeviceConfig, initWebSocket, controlDevice }
})
