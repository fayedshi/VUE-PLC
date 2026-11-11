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

abstract class DeviceState {
    id: number = 0;
    index: number = 0;
    status: number = -1;
}

// 1. 基础状态定义
class WindowState extends DeviceState {
    fan: FanState | null = null
    blower: BlowerState | null = null
}

class FanState extends DeviceState {
    // id: number;
    // index: number;
    // action: WindowActionEnum | null;
    // status: number;
}

class BlowerState extends DeviceState {

}

export class AcState extends DeviceState {

}

// interface TaskState extends DeviceState

abstract class DeviceTask extends DeviceState {
    start: number = 0;
    stop: number = 0
    selected: boolean = false
}

class WindowTask extends DeviceTask {
    start = WindowActionEnum.OPEN;
    stop = WindowActionEnum.CLOSE
    fan: FanTask | null = null
    blower: BlowerTask | null = null
}

class FanTask extends DeviceTask {
}

class BlowerTask extends DeviceTask {
}

class AcTask extends DeviceTask {
    start = AcActionEnum.START
    stop = AcActionEnum.STOP
}

const fanMap = ref<Map<number, number>>(new Map())
const blowerMap = ref<Map<number, number>>(new Map())


export const useWindowControlStore = defineStore('windowControl', () => {
    // --- 模拟解析 YAML 配置 ---

    const loading = ref(false)
    const switchAddress = ref()
    // 初始化/获取后端配置与数据的核心方法
    const initDeviceConfig = async (houseIndex: string) => {
        resetData()
        loading.value = true
        try {
            let config = {
                // windows: { start: 1, end: 18 },
                // fanWindow: { src: [2, 4, 6, 10], target_start: 27 },
                // blowerWindow: { src_start: 11, src_end: 18, target_start: 19 }
            }
            // 1. 从后端获取配置 (后端可以直接返回 JSON 化的 YAML 配置以及当前设备状态)
            const response = await http.get('/api/dev-address', {
                params: {
                    house_index: houseIndex
                }
            })

            console.log('config:', response)
            config = response.data
            // switchAddress.value = config?.['switch'][0]
            // console.log('switchadd ',switchAddress.value)

            // fanMap.value = getDataMap('fanWindow')
            // // console.log('fanMap', fanMap.value)
            // blowerMap.value = getDataMap('blowerWindow')

            // 3. 灌入后端返回的实时状态 (status)
            // 假设后端返回的 currentStatus 结构为 { windows: {...}, fans: {...}, blowers: {...} }
            // Object.assign(windows, currentStatus.windows)
            // Object.assign(fans, currentStatus.fans)
            // Object.assign(blowers, currentStatus.blowers)

            // 初始化所有设备状态
            const cabins = config?.['PLC-Cabin-List']
            cabins.forEach(element => {
                buildWindowList(element)
            });

            console.log('cc list:', cabinList.value)

        } catch (error) {
            console.error('加载窗控配置失败:', error)
            ElMessage.error(`当前房屋[${houseIndex}]配置解析错误，请前往后台检查！`)
        } finally {
            loading.value = false
        }
    }

    // const getDataMap = (key) => {
    //     const idMap = new Map<number, number>()
    //     let subConfig = config?.[key]
    //     if (subConfig.src) {
    //         // console.log('in src')
    //         subConfig.src.forEach((winId: number, index: number) => {
    //             idMap.set(winId, subConfig.target_start + index)
    //         })
    //     } else if (subConfig.src_start) {
    //         // console.log('to src_start')
    //         for (let winId = subConfig.src_start; winId <= subConfig.src_end; winId++) {
    //             const index = winId - subConfig.src_start
    //             idMap.set(winId, subConfig.target_start + index)
    //         }
    //     }
    //     return idMap
    // }

    const buildWindowList = ((config) => {
        let subConfig = config['mapping']
        let winSrcIds = subConfig?.['window_src'] || []
        if (subConfig) {
            delete subConfig.window_src
        }
        console.log('winids:', winSrcIds)
        // const windowStateList = []
        const windowStateList = reactive<Record<number, WindowState>>({})
        winSrcIds.forEach((winId: number, index: number) => {
            const winState: WindowState = { id: winId, status: -1, fan: null, valve: null }
            Object.keys(subConfig).forEach(key => {
                const deviceType = key.substring(0, key.indexOf('_'))
                let deviceId = -1
                if (key.endsWith('_start')) {
                    deviceId = subConfig[key] + index
                } else if (key.endsWith('_list')) {
                    let deviceList = subConfig[key]
                    deviceId = deviceList[index]
                    //winState.fan ={id: deviceList[index], status: -1 }
                }
                winState[deviceType] = { id: deviceId, status: -1 }
            })
            windowStateList[winId] = winState
        })

        // add nature windows
        let range = config['window'] || []
        for (let winId = range[0]; winId <= range[1]; winId++) {
            if (!windowStateList[winId]) {
                windowStateList[winId] = { id: winId, status: -1, fan: null, valve: null }
            }
        }
        cabinList.value.push(Object.values(windowStateList))
    })



    // --- 响应式状态定义 ---, key, value键值对类型
    // const windowStateList = ref<WindowState[]>([])
    const cabinList = ref([])


    let fans = reactive<Record<number, FanState>>({})
    let blowers = reactive<Record<number, BlowerState>>({})
    const acs = ref<Record<number, AcState>>({})
    const acStateList = ref<AcState[]>([])
    // 作业设备列表
    const windowTaskList = ref<WindowTask[]>([])
    const acTaskList = ref<AcTask[]>([])

    const resetData = () => {
        // windows.value = {}
        cabinList.value = []
        // List.value = []
        console.log('已成功清空上一个房屋的数据缓存')
    }

    const updateStatus = (devStatesObj, ccIndex) => {
        // console.log('in updatestatus: ', devStatesObj)
        // Object.keys(windows.value).map(Number).map(winId => {
        //     const fanId = fanMap.value.get(winId) as number
        //     const blowerId = blowerMap.value.get(winId) as number
        //     if (Object.keys(devStatesObj).length > 0) {
        //         // 必须注意，这个winId一定要从1开始，否则跟index对不上
        //         windows.value[winId].status = devStatesObj.windows[winId - 1]
        //         // console.log('insde windowlist', windows[winId].status, 'fan ', fans[fanId])
        //         if (fans[fanId]) {
        //             fans[fanId].status = devStatesObj.fans[fans[fanId].index - 1]
        //         }
        //         if (blowers[blowerId]) {
        //             blowers[blowerId].status = devStatesObj.blowers[blowers[blowerId].index - 1]
        //         }
        //     }
        // })
        cabinList[ccIndex].value.forEach((winState) => {
            winState.status = devStatesObj.windows[winState.id - 1]
            if (winState.fan) {
                // if (winState.child instanceof FanState) {
                winState.fan.status = devStatesObj.fans[winState.fan.index - 1]
            } else if (winState.valve) {
                winState.blower.status = devStatesObj.blowers[winState.blower.index - 1]
            }
        })


        // Object.keys(acs.value).map(Number).map(acId => {
        //     if (Object.keys(devStatesObj).length > 0) {
        //         acs.value[acId].status = devStatesObj.ac[acs.value[acId].index - 1]
        //     }
        // })
        // acStateList.value.forEach((acState) => {
        //     acState.status = devStatesObj.ac[acState.index - 1]
        // })
    }

    // --- 聚合的计算属性：供页面循环渲染使用 ---
    // const windowList = computed(() => {
    //     let list = Object.keys(windows.value).map(Number).map(winId => {
    //         const fanId = fanMap.value.get(winId) as number
    //         const blowerId = blowerMap.value.get(winId) as number
    //         return {
    //             id: winId,
    //             window: windows.value[winId],
    //             fan: fanId ? fans[fanId] : null,
    //             blower: blowerId ? blowers[blowerId] : null,
    //             // label: blowerId ? '门' : '窗'
    //             label: '窗'
    //         }
    //     })

    //     console.log('windowList', list)
    //     return list
    // })

    // const acList = computed(() => {
    //     return Object.keys(acs.value).map(Number).map(acId => {
    //         return {
    //             id: acId,
    //             ac: acs.value[acId],
    //             label: '空调'
    //         }
    //     })
    // })
    const selectedAcList = computed(() =>
        acTaskList.value.filter(acTask => acTask.selected
        )
    )

    const selectedWindowTaskList = computed(() =>
        windowTaskList.value.filter(winTask => winTask.selected
            || winTask?.fan?.selected || winTask?.blower?.selected
        )
    )

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
        }
    }

    return {
        loading, switchAddress,
        // windowStateList, acStateList,
        // windowTaskList, acTaskList,
        // selectedAcList, selectedWindowTaskList,
        cabinList,
        initDeviceConfig, updateStatus, controlDevice
    }
})
