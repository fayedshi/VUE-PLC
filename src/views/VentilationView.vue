<template>
    <div class="control-panel">

        <!-- 🌟 新增：左上角的两组控制模式切换按钮 -->
        <div class="panel-header">
            <div class="category-title">
                <h3>模式切换</h3>
            </div>
            <!-- 第一组：远程 / 本地 -->
            <div class="btn-group">
                <button :class="{ active: controlMode === 2 }" @click="switchControlMode(1, 2, '远程')">
                    远程
                </button>
                <button :class="{ active: controlMode === 1 }" @click="switchControlMode(1, 1, '本地')">
                    本地
                </button>
            </div>

            <!-- 第二组：手动 / 自动 -->
            <div class="btn-group">
                <button :class="{ active: runMode === 2 }" @click="switchControlMode(2, 2, '手动')">
                    手动
                </button>
                <button :class="{ active: runMode === 1 }" @click="switchControlMode(2, 1, '自动')">
                    自动
                </button>
            </div>
        </div>

        <!-- 以下为您原有的 4 个设备大类循环，保持不变 -->
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
                        <span class="dev-name">
                            {{ dev.name }}
                            <span :class="['status-badge', getStatusClass(dev.id)]">
                                {{ statusToText(dev.id, cat.type) || '未知' }}
                            </span>
                        </span>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';


const devStates = ref([])

// 状态映射表（无需响应式，直接定义为普通变量）


const winDoorStatusMap = { 0: '初始化', 1: '正在打开', 2: '正在关闭', 3: '停', 4: '开到位', 5: '关到位', 6: '故障' }
const fanStatusMap = { 0: '初始化', 1: '正转', 2: '反转', 3: '停', 6: '故障' }
const exhaustStatusMap = { 0: '初始化', 1: '正在开启', 3: '停', 6: '故障' }
const acStatusMap = { 0: '停止', 1: '运行' }



const statusToText = (devId, catType) => {
    let devInfo = devId.split('-');
    let index = devInfo[1] - 1;
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
            return acStatusMap[devStates.value[index - 2]]
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
    let index = devInfo[1] - 1;

    // if ([1, 3, 5, 6].includes(status)) return 'status-active';
    // if ([2, 4].includes(status)) return 'status-inactive';
    // console.log("class ", devStates.value[index])
    if (devInfo[0] == 'ac') {
        return 'status-' + devStates.value[index - 2];
    }
    return 'status-' + devStates.value[index];
};

const executeSingleAction = async (device, actionType) => {
    console.log(`单独控制设备【${device.name}】(ID: ${device.id})，执行操作代码: ${actionType}`);
    try {
        let result = await axios.post("http-api/api/dev/control", {
            // let result = await axios.post(`http://${backendAdd}/api/dev/control`, {
            dev_id: device.id,
            action_type: actionType
        });
        console.log('result ', result)
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    } finally {
        console.log('finished')
    }
};


const executeGlobalAction = async (cateType, actionType) => {
    try {
        await axios.post(`http-api/api/dev/control`, {
            // await axios.post(`http://${backendAdd}/api/dev/control`, {
            category_type: cateType,
            action_type: actionType
        });
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    }
};

let socket: any = null;

const initWebSocket = () => {
    // todo: need granary switch control in ui
    socket = new WebSocket(`ws-api-001/ws/dev-state`);
    // socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);

    // 连接成功事件
    socket.onopen = () => {
        console.log('成功连接到 Python 后端 WebSocket！');
    };

    // 接收到后端实时数据事件
    socket.onmessage = (event: any) => {
        // 解析后端传过来的 JSON 字符串
        devStates.value = JSON.parse(event.data);
        // console.log('devstate', devStates.value)
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


// 1. 定义两组模式的响应式状态变量（设置默认选中值）
const controlMode = ref(1) // '2' 远程, '1' 本地
const runMode = ref(1)     // 2 手动, 1 自动

// 2. 远程 / 本地 切换点击事件
const switchControlMode = async (groupIndex, mode, modeText) => {
    let curModeVal = groupIndex == 1 ? controlMode.value : runMode.value
    if (curModeVal === mode) {
        console.log('已经是当前模式则不重复触发')
        return // 已经是当前模式则不重复触发
    }
    try {
        //todo: device address hardcoded, will modify later
        let devId = groupIndex == 1 ? 'switch-399' : 'switch-0'
        let result = await axios.post("http-api/api/dev/control", {
            dev_id: devId,
            action_type: mode
        });
        console.log('result ', result)
        console.log(`控制模式已成功切换为：${modeText}模式`)
        if (groupIndex == 1) {
            controlMode.value = mode
        } else {
            runMode.value = mode
        }
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    } finally {
        console.log('finished mode switch')
    }
}

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


/* 顶层控制面板容器，确保相对定位 */
.control-panel {
    position: relative;
    padding-top: 60px;
    /* 留出顶部空间给新增的按钮栏，防止遮挡设备列表 */
}

/* 顶部按钮栏容器 */
.panel-header {
    position: absolute;
    top: 15px;
    left: 20px;
    display: flex;
    gap: 20px;
    /* 两组按钮之间的间距 */
    z-index: 10;
}

/* 按钮组包裹盒 */
.btn-group {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 切换按钮默认基本样式 */
.btn-group button {
    border: 1px solid #dcdfe6;
    background-color: #ffffff;
    color: #606266;
    padding: 6px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
}

/* 消除双按钮并排时中间边框变粗的问题 */
.btn-group button:not(:first-child) {
    border-left: none;
}

/* 鼠标悬停时的微互动 */
.btn-group button:hover {
    color: #409eff;
    background-color: #ecf5ff;
}

/* 🌟 核心：当按钮处于激活（选中）状态时的醒目样式 */
.btn-group button.active {
    background-color: #409eff;
    /* 经典科技蓝，可根据您项目的主题色调整 */
    color: #ffffff;
    border-color: #409eff;
}
</style>
