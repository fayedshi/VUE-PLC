import { reactive, computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http from '../../api/http';
import { ElMessage } from 'element-plus';

export enum WindowActionEnum {
    OPEN = 1,
    CLOSE = 2,
    STOP = 3,
}

export enum FanActionEnum {
    START = 1,
    STOP = 3,
}

export enum BlowerActionEnum {
    FORWARD = 1,
    REVERSE = 2,
    STOP = 3
}

export enum AcActionEnum {
    START = 1,
    STOP = 2
}

// 1. 基础状态定义
interface WindowState {
    id: number;
    index: number;
    action: WindowActionEnum | null;
    status: number; // 比如：'opened', 'closed', 'moving'
}

interface WindowTask extends WindowState {
    start: WindowActionEnum | null;
    stop: WindowActionEnum; 
}

interface FanState {
    id: number;
    index: number;
    action: WindowActionEnum | null;
    status: number;
}

interface BlowerState {
    id: number;
    index: number;
    action: WindowActionEnum | null;
    status: number;
}
interface AcState {
    id: number;
    index: number;
    action: WindowActionEnum | null;
    status: number;
}
const fanMap = ref<Map<number, number>>(new Map())
const blowerMap = ref<Map<number, number>>(new Map())


export const useWindowControlStore = defineStore('windowControl', () => {
    // --- 模拟解析 YAML 配置 ---
    let config = {
        // windows: { start: 1, end: 18 },
        // fanWindow: { src: [2, 4, 6, 10], target_start: 27 },
        // blowerWindow: { src_start: 11, src_end: 18, target_start: 19 }
    }
    const loading = ref(false)
    const switchAddress = ref()
    // 初始化/获取后端配置与数据的核心方法
    const initDeviceConfig = async (houseCode: string) => {
        resetData()
        loading.value = true
        try {
            // 1. 从后端获取配置 (后端可以直接返回 JSON 化的 YAML 配置以及当前设备状态)
            const response = await http.get(`/api/dev-address/${houseCode}`)
            console.log('config:', response)
            config = response.data
            switchAddress.value = config?.['switch'][0]
            // console.log('switchadd ',switchAddress.value)
            // 2. 动态解析映射规则
            // const fMap = new Map<number, number>()
            // if (config.fanWindow) {
            //     config.fanWindow.src.forEach((winId: number, index: number) => {
            //         fMap.set(winId, config.fanWindow.target_start + index)
            //     })
            //     fanMap.value = fMap
            // }
            fanMap.value = getDataMap('fanWindow')
            console.log('fanMap', fanMap.value)

            // const bMap = new Map<number, number>()
            // for (let winId = config.blowerWindow.src_start; winId <= config.blowerWindow.src_end; winId++) {
            //     const index = winId - config.blowerWindow.src_start
            //     bMap.set(winId, config.blowerWindow.target_start + index)
            // }
            blowerMap.value = getDataMap('blowerWindow')

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
                        // windowIndex = 1
                        damperStart = true
                    }
                    const blowerId = blowerMap.value.get(i)!
                    blowers[blowerId] = { id: blowerId, index: blowerIndex++, action: null, status: -1 }
                }
                // todo: 这里可以加一个windowDisplayIndex
                windows.value[i] = { id: i, index: windowIndex++, action: null, status: -1 }
            }

            let j = 1;
            for (let i = config.ac[0]; i <= config.ac[1]; i++) {
                acs.value[i] = { id: i, index: j++, action: null, status: -1 }
            }
            console.log('acs', acs.value)
        } catch (error) {
            console.error('加载窗控配置失败:', error)
            ElMessage.error(`当前房屋[${houseCode}]配置解析错误，请前往后台检查！`)
        } finally {
            loading.value = false
        }
    }

    const getDataMap = (key) => {
        const idMap = new Map<number, number>()
        let subConfig = config?.[key]
        if (subConfig.src) {
            console.log('in src')
            subConfig.src.forEach((winId: number, index: number) => {
                idMap.set(winId, subConfig.target_start + index)
            })
        } else if (subConfig.src_start) {
            console.log('to src_start')
            for (let winId = subConfig.src_start; winId <= subConfig.src_end; winId++) {
                const index = winId - subConfig.src_start
                idMap.set(winId, subConfig.target_start + index)
            }
        }
        return idMap
    }



    // --- 响应式状态定义 ---, key, value键值对类型
    const windows = ref<Record<number, WindowState>>({})
    let fans = reactive<Record<number, FanState>>({})
    let blowers = reactive<Record<number, BlowerState>>({})
    const acs = ref<Record<number, AcState>>({})

    const resetData = () => {
        windows.value = {}
        // fans = {}
        // blowers = {}
        acs.value = {}
        console.log('已成功清空上一个房屋的数据缓存')
    }

    const updateStatus = (devStatesObj) => {
        // console.log('in updatestatus: ', devStatesObj)
        Object.keys(windows.value).map(Number).map(winId => {
            const fanId = fanMap.value.get(winId) as number
            const blowerId = blowerMap.value.get(winId) as number
            if (Object.keys(devStatesObj).length > 0) {
                // 必须注意，这个winId一定要从1开始，否则跟index对不上
                windows.value[winId].status = devStatesObj.windows[winId - 1]
                // console.log('insde windowlist', windows[winId].status, 'fan ', fans[fanId])
                if (fans[fanId]) {
                    fans[fanId].status = devStatesObj.fans[fans[fanId].index - 1]
                }
                if (blowers[blowerId]) {
                    blowers[blowerId].status = devStatesObj.blowers[blowers[blowerId].index - 1]
                }
            }
        })
        Object.keys(acs.value).map(Number).map(acId => {
            if (Object.keys(devStatesObj).length > 0) {
                acs.value[acId].status = devStatesObj.ac[acs.value[acId].index - 1]
            }
        })
    }

    // --- 聚合的计算属性：供页面循环渲染使用 ---
    const windowList = computed(() => {
        let list = Object.keys(windows.value).map(Number).map(winId => {
            const fanId = fanMap.value.get(winId) as number
            const blowerId = blowerMap.value.get(winId) as number
            return {
                id: winId,
                window: windows.value[winId],
                fan: fanId ? fans[fanId] : null,
                blower: blowerId ? blowers[blowerId] : null,
                // label: blowerId ? '门' : '窗'
                label: '窗'
            }
        })

        console.log('windowList', list)
        return list
    })

    const acList = computed(() => {
        return Object.keys(acs.value).map(Number).map(acId => {
            return {
                id: acId,
                ac: acs.value[acId],
                label: '空调'
            }
        })
    })


    // --- 控制动作 (对接后端 API / Mqtt) ---
    const controlDevice = async (houseCode: string, type: 'window' | 'fan' | 'blower' | 'ac' | 'switch', id: number, action: number) => {
        console.log(`发送指令: housecode-${houseCode} 设备类型[${type}], 设备ID[${id}], 动作[${action}]`)
        try {
            let result = await http.post('/api/dev/control', {
                house_code: houseCode,
                dev_id: id,
                action: action
            });
            ElMessage.success(result.data.message)
            // console.log('result ', result)
        } catch (err) {
            // alert('操作失败: '+err);
        } finally {
            console.log('finished')
        }

    }

    return { loading, switchAddress, windowList, acList, initDeviceConfig, updateStatus, controlDevice }
})
