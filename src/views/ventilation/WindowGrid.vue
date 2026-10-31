<template>
    <div class="control-container" v-loading="store.loading" element-loading-text="正在读取后端拓扑配置...">
        <!-- 顶部状态栏 -->
        <!-- <div class="page-header">
            <h2>🏭 智能窗控与通风设备管理中心</h2>
            <el-alert title="数据联动提示：系统已根据 YAML 拓扑自动映射排风扇 (27-30) 与风机 (19-26) 的从属关系。" type="info" show-icon
                :closable="false" />
        </div> -->

        <!-- 设备网格布局 -->
        <div class="panel-header">
            <div class="category-title">
                <h3>模式切换</h3>
            </div>
            <!-- 第一组：远程 / 本地 -->
            <div class="btn-group">
                <button :class="{ active: controlMode === 1 }" @click="switchMode('switch', store.switchAddress, 2)">
                    远程
                </button>
                <button :class="{ active: controlMode === 0 }" @click="switchMode('switch', store.switchAddress, 1)">
                    本地
                </button>
            </div>

            <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
        </div>
        <el-row :gutter="20" v-if="nonBlowerWindowList.length > 0">
            <el-col v-for="item in nonBlowerWindowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
                <WindowCard :data="item" @action="handleDeviceAction" />
            </el-col>
        </el-row>
        <el-row :gutter="20" v-if="blowerWindowList.length > 0">
            <el-col v-for="item in blowerWindowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
                <WindowCard :data="item" @action="handleDeviceAction" />
            </el-col>
        </el-row>

        <el-row :gutter="20" v-if="store.acStateList.length > 0">
            <el-col v-for="item in store.acStateList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
                <WindowCard :data="item" @action="handleDeviceAction" />
            </el-col>
        </el-row>
        <!-- 空状态提示 -->
        <el-empty v-else-if="!store.loading" description="暂无设备配置数据" />
    </div>
</template>

<script setup>
import HouseSelect from '../../components/HouseSelect.vue';
import { AcActionEnum, useWindowControlStore } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'

const store = useWindowControlStore()
const selectedHouseCode = ref('001');
const controlMode = ref(0)
const nonBlowerWindowList = computed(() => {
    return store.windowStateList.filter(window => !window.blower)
})

const blowerWindowList = computed(() => {
    return store.windowStateList.filter(window => window.blower)
})

const devStatesObj = ref({
})

const handleHouseChange = async () => {
    await store.initDeviceConfig(selectedHouseCode.value)
    console.log('after house change: ', store.windowStateList)
}

// 2. 远程 / 本地 切换点击事件
const switchMode = async (type, id, action) => {

    try {
        await store.controlDevice(selectedHouseCode.value, type, id, action)
        // console.log('result ', result)
        console.log(`控制模式已成功切换`)

    } catch (err) {
        alert('操作失败，请检查 PLC 连接');
    } finally {
        console.log('finished mode switch')
    }
}

let isExplicitlyClosed = false
let socket = null
const initWebSocket = () => {
    // todo: need granary switch control in ui, hardcode 001 for now

    socket = new WebSocket(`ws-api/ws/dev-state/${selectedHouseCode.value}`);
    // socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);`

    // 连接成功事件
    socket.onopen = () => {
        console.log('成功连接到 Python 后端 WebSocket！');
    };

    // 接收到后端实时数据事件
    socket.onmessage = (event) => {
        // 解析后端传过来的 JSON 字符串
        devStatesObj.value = JSON.parse(event.data);

        // console.log('devstate', event.data)
        // devStatesObj.value= {"switch":[1],"windows":[6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],"blowers":[0,0,0,0,0,0,0,0],"fans":[0,0,0,0],"ac":[0,0]}
        controlMode.value = devStatesObj.value?.['switch'][0]
        store.updateStatus(devStatesObj.value)
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

onMounted(async () => {
    console.log('selected house', selectedHouseCode.value)
    try {
        const result = await store.initDeviceConfig(selectedHouseCode.value)
    }
    catch (err) {
        console.log('initDeviceConfig 发生错误')
    }
    initWebSocket()
})
// 拦截子组件动作并调用 Store
const handleDeviceAction = async ({ type, id, action }) => {
    await store.controlDevice(selectedHouseCode.value, type, id, action)
}

onBeforeUnmount(() => {
    if (socket) {
        console.log('venti manual panel destroyed')
        socket.close();
        isExplicitlyClosed = true
    }
});
</script>

<style scoped>
.control-container {
    padding: 24px;
    background-color: #f5f7fa;
    min-height: 100vh;
}

/* 顶部按钮栏容器 */
.panel-header {
    display: flex;
    align-items: center;
    justify-content: left;
    /* padding: 12px 20px; */
    background: #ffffff;
    border-radius: 8px;
    /* box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05); */
    border: 1px solid #ebeef5;
    gap: 16px;
}

/* 按钮组包裹盒 */
.btn-group {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.category-title {
    width: 90px;
    flex-shrink: 0;
}

.btn-group button.active {
    background-color: #409eff;
    color: #ffffff;
    border-color: #409eff;
}

.page-header {
    margin-bottom: 24px;
}

.page-header h2 {
    margin-bottom: 12px;
    color: #303133;
}
</style>
