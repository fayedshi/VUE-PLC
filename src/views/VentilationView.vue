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
                        <span class="dev-name">{{ dev.name }}</span>
                        <span :class="['status-badge', getStatusClass(dev.status)]">
                            {{ statusMap[dev.id] || '未知' }}
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
                    @click="executeGlobalAction(cat, btn.type, btn.name)">
                    {{ btn.name }}
                </button>
            </div>
            <!-- 如果没有全局按钮，占位保持间距 -->
            <div class="action-bar-empty" v-else></div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

// 状态映射表（无需响应式，直接定义为普通变量）
const statusMap = {
    0: '停止',
    1: '开启中',
    2: '关闭中',
    3: '已开启',
    4: '已关闭',
    5: '正转中',
    6: '反转中'
};


const devIdToIndex=(devId)=>{
    
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
        devices: Array.from({ length: 10 }, (_, i) => ({ id: `win-${i}`, name: `窗 ${i + 1}`, status: 4 }))
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
const getStatusClass = (status) => {
    if ([1, 3, 5, 6].includes(status)) return 'status-active';
    if ([2, 4].includes(status)) return 'status-inactive';
    return 'status-default';
};

// 单个设备的操作触发
// const executeSingleAction = (device, actionType) => {
//   console.log(`单独控制设备【${device.name}】(ID: ${device.id})，执行操作代码: ${actionType}`);
//   // 示例：点击后可以前端直接模拟状态改变，或者调用后端 API
//   // device.status = actionType; 
// };


const executeSingleAction = async (device, cateType, actionType) => {
    console.log('actionId', actionId, 'selectedIds.value', selectedIds.value)

    if (!canOperate.value)
        return;
    isLoading.value = true;
    // 不排序，写plc地址会乱
    //   let sortedIds = selectedIds.value.sort((a, b) => a - b);
    try {
        await axios.post(`http://${backendAdd}/api/dev/control`, {
            dev_id: device.id,
            category_type: cateType,
            action_type: actionType
        });
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    } finally {
        isLoading.value = false;
    }
};


const executeGlobalAction = async (category, actionType, actionName) => {
    console.log('actionId', actionId, 'selectedIds.value', selectedIds.value)

    // isLoading.value = true;
    // 不排序，写plc地址会乱
    //   let sortedIds = selectedIds.value.sort((a, b) => a - b);
    try {
        await axios.post(`http://${backendAdd}/api/dev/control`, {
            category_type: category.type,
            action_type: actionType
        });
    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    }
};


// 整排一键全控操作触发
const executeGlobalAction1 = (category, actionType, actionName) => {
    console.log(`一键触发【${category.label}】整排的【${actionName}】功能，操作代码: ${actionType}`);
    const allIds = category.devices.map(d => d.id);
    console.log('受影响的所有设备 ID:', allIds);
};



const devStates = ref([])
// --- 方法 ---
// const fetchStatus = async () => {
//   try {
//     const res = await axios.get('http://localhost:8000/api/windows/status');
//     console.log('window status: ', res.data)
//     retStatus.value = res.data
//   } catch (err) {
//     console.error(err);
//   }
// };

let socket = null;
let backendAdd = '192.168.0.16:8000'

const initWebSocket = () => {
    // 如果在电脑本机测试，保持 localhost；如果要手机访问，请改为工控机的局域网 IP
    socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);

    // 连接成功事件
    socket.onopen = () => {
        console.log('成功连接到 Python 后端 WebSocket！');
    };

    // 接收到后端实时数据事件
    socket.onmessage = (event) => {
        // 解析后端传过来的 JSON 字符串
        devStates.value = JSON.parse(event.data);
        // windows.value[0].status = devStates.value[0]
        // windows.value[1].status = devStates.value[1]
    };

    // 连接关闭事件
    socket.onclose = () => {
        // isConnected.value = false;
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
