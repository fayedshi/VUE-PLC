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
                <button :class="{ active: store.controlMode === 1 }" @click="switchControlMode(1, 2, '远程')">
                    远程
                </button>
                <button :class="{ active: store.controlMode === 0 }" @click="switchControlMode(1, 1, '本地')">
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

        <el-row :gutter="20" v-if="store.acList.length > 0">
            <el-col v-for="item in store.acList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
                <WindowCard :data="item" @action="handleDeviceAction" />
            </el-col>
        </el-row>
        <!-- 空状态提示 -->
        <el-empty v-else-if="!store.loading" description="暂无设备配置数据" />
    </div>
</template>

<script setup>
import { useWindowControlStore } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
import HouseSelect from '../../components/HouseSelect.vue';
import { onMounted, ref, computed } from 'vue'

const store = useWindowControlStore()
const selectedHouseCode = ref('001');

const nonBlowerWindowList = computed(() => {
    return store.windowList.filter(window => !window.blower)
})

const blowerWindowList = computed(() => {
    return store.windowList.filter(window => window.blower)
})


onMounted(async () => {
    await store.initDeviceConfig()
    store.initWebSocket()
})
// 拦截子组件动作并调用 Store
const handleDeviceAction = ({ type, id, action }) => {
    store.controlDevice(type, id, action)
}
</script>

<style scoped>
.control-container {
    padding: 24px;
    background-color: #f5f7fa;
    min-height: 100vh;
}

/* 顶部按钮栏容器 */
.panel-header {
    /* position: absolute; */
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

.category-title {
    width: 90px;
    flex-shrink: 0;
}

.btn-group button.active {
    background-color: #409eff;
    /* 经典科技蓝，可根据您项目的主题色调整 */
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
