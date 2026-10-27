import { reactive, computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http from '../../api/http';

// 1. 基础状态定义
interface WindowState {
    id: number;
    action: 'open' | 'close' | 'stop' | null;
    status: string; // 比如：'opened', 'closed', 'moving'
}

interface FanState {
    id: number;
    action: 'open' | 'close' | 'stop' | null;
    status: string;
}

interface BlowerState {
    id: number;
    action: 'forward' | 'reverse' | 'stop' | null;
    status: string;
}

export const useWindowControlStore = defineStore('windowControl', () => {
    // --- 模拟解析 YAML 配置 ---
    const config = {
        windows: { start: 1, end: 18 },
        fanWindow: { src: [2, 4, 6, 10], target_start: 27 },
        blowerWindow: { src_start: 11, src_end: 18, target_start: 19 }
    }
    const loading = ref(false)
    
    // 初始化/获取后端配置与数据的核心方法
    const initDeviceConfig = async () => {
        loading.value = true
        try {
            // 1. 从后端获取配置 (后端可以直接返回 JSON 化的 YAML 配置以及当前设备状态)
            const response = await http.get('/api/window-system/config-and-status')
            const { config, currentStatus } = response.data

            // 2. 动态解析映射规则
            const fMap = new Map<number, number>()
            config.fanWindow.src.forEach((winId: number, index: number) => {
                fMap.set(winId, config.fanWindow.target_start + index)
            })
            fanMap.value = fMap

            const bMap = new Map<number, number>()
            for (let winId = config.blowerWindow.src_start; winId <= config.blowerWindow.src_end; winId++) {
                const index = winId - config.blowerWindow.src_start
                bMap.set(winId, config.blowerWindow.target_start + index)
            }
            blowerMap.value = bMap

            // 3. 灌入后端返回的实时状态 (status)
            // 假设后端返回的 currentStatus 结构为 { windows: {...}, fans: {...}, blowers: {...} }
            Object.assign(windows, currentStatus.windows)
            Object.assign(fans, currentStatus.fans)
            Object.assign(blowers, currentStatus.blowers)

        } catch (error) {
            console.error('加载窗控配置失败:', error)
        } finally {
            loading.value = false
        }
    }

    // --- 动态生成物理设备映射关系 (用于与后端通信) ---
    // 窗 ID -> 排风扇 ID 的映射
    const fanMap = new Map<number, number>()
    config.fanWindow.src.forEach((winId, index) => {
        fanMap.set(winId, config.fanWindow.target_start + index)
    })

    // 窗 ID -> 风机 ID 的映射
    const blowerMap = new Map<number, number>()
    for (let winId = config.blowerWindow.src_start; winId <= config.blowerWindow.src_end; winId++) {
        const index = winId - config.blowerWindow.src_start
        blowerMap.set(winId, config.blowerWindow.target_start + index)
    }

    // --- 响应式状态定义 ---
    const windows = reactive<Record<number, WindowState>>({})
    const fans = reactive<Record<number, FanState>>({})
    const blowers = reactive<Record<number, BlowerState>>({})

    // 初始化所有设备状态
    for (let i = config.windows.start; i <= config.windows.end; i++) {
        windows[i] = { id: i, action: null, status: 'closed' }

        if (fanMap.has(i)) {
            const fanId = fanMap.get(i)!
            fans[fanId] = { id: fanId, action: null, status: 'off' }
        }

        if (blowerMap.has(i)) {
            const blowerId = blowerMap.get(i)!
            blowers[blowerId] = { id: blowerId, action: null, status: 'stopped' }
        }
    }

    // --- 聚合的计算属性：供页面循环渲染使用 ---
    const windowList = computed(() => {
        return Object.keys(windows).map(Number).map(winId => {
            const fanId = fanMap.get(winId)
            const blowerId = blowerMap.get(winId)

            return {
                id: winId,
                window: windows[winId],
                fan: fanId ? fans[fanId] : null,
                blower: blowerId ? blowers[blowerId] : null
            }
        })
    })

    // --- 控制动作 (对接后端 API / Mqtt) ---
    const controlDevice = async (type: 'window' | 'fan' | 'blower', id: number, action: string) => {
        console.log(`发送指令: 设备类型[${type}], 设备ID[${id}], 动作[${action}]`)
        // 发送网络请求...
        // axios.post('/api/control', { type, id, action })
    }

    return { loading, windowList,initDeviceConfig, controlDevice }
})
