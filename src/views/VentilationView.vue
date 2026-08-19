<template>
    <div class="control-panel">
        <!-- 遍历 4 个设备大类 -->
        <div v-for="cat in categories" :key="cat.type" class="category-row">
            <!-- 左侧：分类标题 -->
            <div class="category-title">
                <h3>{{ cat.label }}</h3>
            </div>

            <!-- 中间：设备列表展示区 -->
            <div class="device-list">
                <div v-for="dev in cat.devices" :key="dev.id" class="device-card">
                    <!-- 上半部分：设备名与状态展示 -->
                    <div class="device-header">
                        <span class="dev-name">{{ dev.name }} <span :class="['status-badge', getStatusClass(dev.id)]">
                            {{ statusToText(dev.id,cat.type)|| '未知' }}
                            <!-- {{ statusMap[dev.id] || '未知' }} -->
                        </span></span>
                        
                    </div>

                    <!-- 下半部分：单个设备专属的操作按钮组 -->
                    <div class="device-actions">
                        <!-- 针对：通风窗、门控制、排风扇 (开/关/停 或 开/停) -->
                        <template v-if="['window', 'door', 'exhaust'].includes(cat.type)">
                            <button class="action-single btn-open-text" @click="executeSingleAction(dev, 1)">开</button>
                            <button v-if="cat.type !== 'exhaust'" class="action-single btn-close-text"
                                @click="executeSingleAction(dev, 2)">关</button>
                            <button class="action-single btn-stop-text" @click="executeSingleAction(dev, 3)">停</button>
                        </template>

                        <!-- 针对：风机专属 (正转/反转/停) -->
                        <template v-if="cat.type === 'fan'">
                            <button class="action-single btn-open-text" @click="executeSingleAction(dev, 1)">正</button>
                            <button class="action-single btn-invert-text"
                                @click="executeSingleAction(dev, 2)">反</button>
                            <button class="action-single btn-stop-text" @click="executeSingleAction(dev, 3)">停</button>
                        </template>

                        <template v-if="cat.type === 'ac'">
                            <button class="action-single btn-open-text" @click="executeSingleAction(dev, 1)">开</button>
                            <button class="action-single btn-stop-text" @click="executeSingleAction(dev, 2)">停</button>
                        </template>
                    </div>
                </div>
            </div>

            <!-- 右侧：全局控制按钮区 -->
            <div class="action-bar" v-if="cat.globalActions && cat.globalActions.length > 0">
                <button v-for="btn in cat.globalActions" :key="btn.type" :class="['btn', btn.className]"
                    @click="executeGlobalAction(cat.type, btn.type)">
                    {{ btn.name }}
                </button>
            </div>
            <!-- 如果没有全局按钮，占位保持间距 -->
            <div class="action-bar-empty" v-else></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted,onBeforeUnmount } from 'vue';
import axios from 'axios';

const devStates = ref([])
// 状态映射表（无需响应式，直接定义为普通变量）


const winDoorStatusMap = { 0: '初始化', 1: '正在打开', 2: '正在关闭', 3: '停', 4: '开到位', 5: '关到位', 6: '故障' }
const fanStatusMap = { 0: '初始化', 1: '正转', 2: '反转', 3: '停', 6: '故障' }
const exhaustStatusMap = { 0: '初始化', 1: '正在开启', 3: '停', 6: '故障' }
const acStatusMap = { 0: '停止', 1: '运行' }



const statusToText = (devId, catType) => {
    let devInfo = devId.split('-');
    let index = devInfo[1]-1;
    // console.log('in statusToText',devInfo, 'index ', index, 'sates: ',devStates.value)
    // console.log('any ',devStates.)
    switch (catType) {
        case 'window':
        case 'door':
            // console.log('devStates[index] ',devStates.value[index])
            // console.log(winDoorStatusMap[devStates.value[index]])
            return winDoorStatusMap[devStates.value[index]]
        case 'fan':
            // console.log(fanStatusMap[devStates.value[index]])
            return fanStatusMap[devStates.value[index]]
        case 'exhaust':
            // console.log(exhaustStatusMap[devStates.value[index]])
            return exhaustStatusMap[devStates.value[index]]
        case 'ac':
            // console.log(acStatusMap[devStates.value[index]])
            // 中间隔了全窗控和全门控
            return acStatusMap[devStates.value[index-2]]
        default:
            return '未知'
    }
}
// 核心数据结构（使用 ref 包裹使其具备响应式能力，方便后续对接 API 动态更新状态）
const categories = ref([
    {
        type: 'window',
        label: '通风窗',
        globalActions: [
            { type: 1, name: '全开', className: 'btn-open' },
            { type: 2, name: '全关', className: 'btn-close' },
            { type: 3, name: '全停', className: 'btn-stop' }
        ],
        devices: Array.from({ length: 10 }, (_, i) => ({ id: `win-${i + 1}`, name: `窗 ${i + 1}`, status: 4 }))
    },
    {
        type: 'door',
        label: '门控制',
        globalActions: [
            { type: 1, name: '全开', className: 'btn-open' },
            { type: 2, name: '全关', className: 'btn-close' },
            { type: 3, name: '全停', className: 'btn-stop' }
        ],
        devices: Array.from({ length: 8 }, (_, i) => ({ id: `door-${i + 11}`, name: `门 ${i + 1}`, status: 4 }))
    },
    {
        type: 'fan',
        label: '风机',
        globalActions: [],
        devices: Array.from({ length: 8 }, (_, i) => ({ id: `fan-${i + 19}`, name: `风机 ${i + 1}`, status: 0 }))
    },
    {
        type: 'exhaust',
        label: '排风扇',
        globalActions: [],
        devices: Array.from({ length: 4 }, (_, i) => ({ id: `exhaust-${i + 27}`, name: `排风 ${i + 1}`, status: 0 }))
    },
    {
        type: 'ac',
        label: '空调',
        globalActions: [],
        devices: Array.from({ length: 2 }, (_, i) => ({ id: `ac-${i + 33}`, name: `空调 ${i + 1}`, status: 0 }))
    }
]);

// 状态样式计算函数
const getStatusClass = (devId) => {
    let devInfo = devId.split('-');
    let index = devInfo[1]-1;
    
    // if ([1, 3, 5, 6].includes(status)) return 'status-active';
    // if ([2, 4].includes(status)) return 'status-inactive';
    console.log("class ",devStates.value[index])
    if(devInfo[0]=='ac'){
        return 'status-'+devStates.value[index-2];
    }
    return 'status-'+devStates.value[index];
};

const executeSingleAction = async (device, actionType) => {
    console.log(`单独控制设备【${device.name}】(ID: ${device.id})，执行操作代码: ${actionType}`);
    try {
        let result=await axios.post(`http://${backendAdd}/api/dev/control`, {
            dev_id: device.id,
            action_type: actionType
        });
        console.log('result ',result)
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    } finally{
        console.log('finiished')
    }
};


const executeGlobalAction = async (cateType, actionType) => {
    try {
        await axios.post(`http://${backendAdd}/api/dev/control`, {
            category_type: cateType,
            action_type: actionType
        });
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    }
};

let socket:any = null;
let backendAdd = 'localhost:8000'

const initWebSocket = () => {
    // 如果在电脑本机测试，保持 localhost；如果要手机访问，请改为工控机的局域网 IP
    socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);

    // 连接成功事件
    socket.onopen = () => {
        console.log('成功连接到 Python 后端 WebSocket！');
    };

    // 接收到后端实时数据事件
    socket.onmessage = (event:any) => {
        // 解析后端传过来的 JSON 字符串
        devStates.value = JSON.parse(event.data);
        console.log('devstate',devStates.value)
        
    };

    // 连接关闭事件
    socket.onclose = () => {
        // console.log('【前端提示】连接已断开，3秒后尝试自动重连...');
        setTimeout(initWebSocket, 3000); // 掉线自动重连机制
    };

    // 发生错误事件
    socket.onerror = (error) => {
        console.error('【前端提示】WebSocket 发生错误:', error);
    };
};

// 3. 生命周期：组件加载时启动连接
onMounted(() => {
    console.log('ready to start fetching plc backend data')
    initWebSocket();
});

// 4. 生命周期：组件销毁时关闭连接，释放工控机内存
onBeforeUnmount(() => {
    if (socket)
        socket.close();
});

// const getStatusText = (s) => ['初始化', '开启', '关闭', '停', '开到位', '关到位', '窗故障'][s] || '未知';
// const getStatusClass = (s) => [`status-${s}`];


</script>

<style scoped>
.control-panel {
    padding: 20px;
    background: #f5f7fa;
}

.category-row {
    display: flex;
    align-items: center;
    background: #ffffff;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.category-title {
    width: 90px;
    flex-shrink: 0;
}

.category-title h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
}

.device-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0 20px;
}

/* 单个设备卡片容器 */
.device-card {
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    padding: 10px;
    width: 105px;
    background: #fff;
    box-sizing: border-box;
}

.device-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 8px;
}

.dev-name {
    font-size: 13px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 4px;
}

.status-badge {
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: #f4f4f5;
    color: #909399;
}



.status-0 {
  background: #e29e6d;
}

/*  开启 */
.status-1 {
  background: #67c23a;
}

/* 关闭 */
.status-2 {
  background: #c58282;
}

/*  停止*/
.status-3 {
  background: #e6a23c;
  animation: pulse 1s infinite;
}

/*  开到位*/
.status-4 {
  background: #37b972;
}

/*  关到位*/
.status-5 {
  background: #4e4848;
}
/*  窗故障*/
.status-6 {
  background: #d4b710;
}


.status-active {
    background: #e1f3d8;
    color: #67c23a;
}

.status-inactive {
    background: #fef0f0;
    color: #f56c6c;
}

/* 卡片内部按钮布局 */
.device-actions {
    display: flex;
    justify-content: center;
    gap: 4px;
    border-top: 1px dashed #ebeef5;
    padding-top: 8px;
}

/* 卡片内部小文本按钮 */
.action-single {
    padding: 2px 4px;
    font-size: 11px;
    border: 1px solid #dcdfe6;
    background: #fff;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.1s;
    flex: 1;
    text-align: center;
}

.action-single:hover {
    background: #f5f7fa;
}

.btn-open-text:hover {
    color: #67c23a;
    border-color: #67c23a;
}

.btn-close-text:hover {
    color: #f56c6c;
    border-color: #f56c6c;
}

.btn-stop-text:hover {
    color: #e6a23c;
    border-color: #e6a23c;
}

.btn-invert-text:hover {
    color: #409eff;
    border-color: #409eff;
}

/* 右侧操作按钮区 */
.action-bar,
.action-bar-empty {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    width: 230px;
    justify-content: flex-end;
}

.btn {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 13px;
}

.btn-open {
    background: #67c23a;
    color: white;
}

.btn-open:hover {
    background: #85ce61;
}

.btn-close {
    background: #f56c6c;
    color: white;
}

.btn-close:hover {
    background: #f78989;
}

.btn-stop {
    background: #e6a23c;
    color: white;
}

.btn-stop:hover {
    background: #ebb563;
}
</style>
