<template>
    <div class="control-container" v-loading="store.loading" element-loading-text="正在读取后端拓扑配置...">

        <!-- 顶部全局配置栏（仓房选择） -->
        <div class="global-header">
            <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
        </div>

        <!-- 当有控制柜数据时，显示多标签页 -->
        <el-tabs v-if="store.cabinList && store.cabinList.length > 0" v-model="activeCabinetTab" type="border-card"
            class="cabinet-tabs">
            <!-- 循环生成控制柜 Tab -->
            <el-tab-pane v-for="(windowList, index) in store.cabinList" :key="index" :label="`控制柜 ${index + 1}`"
                :name="String(index)">
                <!-- 每个控制柜内部的独立控制面板 -->
                <div class="panel-box">

                    <!-- 局部面板头部：当前控制柜的模式切换 -->
                    <div class="panel-header">
                        <div class="category-title">
                            <h3>模式切换</h3>
                        </div>
                        <!-- 绑定当前控制柜自己的控制模式 -->
                        <div class="btn-group">
                            <button :class="{ active: controlMode === 1 }"
                                @click="switchMode('switch', store.switchAddress, 2)">
                                远程
                            </button>
                            <button :class="{ active: controlMode === 0 }"
                                @click="switchMode('switch', store.switchAddress, 1)">
                                本地
                            </button>
                        </div>
                    </div>

                    <!-- 当前控制柜下的设备网格布局 -->
                    <el-row :gutter="20" v-if="windowList && windowList.length > 0">
                        <el-col v-for="(item, index) in windowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
                            <!-- 传入当前控制柜的设备数据 -->
                            <WindowCard :data="item" :seqNo="index + 1" @action="handleDeviceAction" />
                        </el-col>
                    </el-row>

                    <!-- 当前控制柜下无设备 -->
                    <el-empty v-else description="该控制柜暂无设备配置" />

                </div>
            </el-tab-pane>
        </el-tabs>

        <!-- 全局无控制柜数据提示 -->
        <el-empty v-else-if="!store.loading" description="暂无控制柜配置数据" />
    </div>
</template>

<script setup lang="ts">
import HouseSelect from '../../components/HouseSelect.vue';
import { useWindowControlStore } from '../../store/WindowControl' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'

const store = useWindowControlStore()
const controlMode = ref('')
const selectedHouseCode = ref('')
const activeCabinetTab = ref(0) // 当前选中的控制柜 Tab ID

// 监听仓房切换
const handleHouseChange = async (val: string) => {
    // 1. 调用 store 里的方法获取该仓房下的所有控制柜及设备拓扑
    await store.initDeviceConfig(selectedHouseCode.value)
    console.log('len ', store.cabinList.length)
    // // 2. 数据加载完成后，默认选中第一个控制柜的 Tab
    if (store.cabinList.length > 0) {
        activeCabinetTab.value = 0
    }
}

// 修改模式切换方法，传入 cabinetId 明确是要修改哪个柜子
const switchMode = (type: string, address: string, mode: number, cabinetId: string) => {
    console.log(`控制柜 ${cabinetId} 切换模式为: ${mode}`)
    // 调用后端 API 或 store 方法发送指令
    // store.updateCabinetMode(cabinetId, mode)
}

// 拦截子组件动作并调用 Store
const handleDeviceAction = async ({ type, id, action }) => {
    await store.controlDevice(selectedHouseCode.value, type, id, action)
}

</script>

<style scoped>
.control-container {
    padding: 24px;
    background-color: #f5f7fa;
    min-height: 100vh;
}

/* 全局仓房选择头部 */
.global-header {
    margin-bottom: 16px;
    background: #ffffff;
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #ebeef5;
}

/* Tabs 容器样式 */
.cabinet-tabs {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.panel-box {
    padding: 8px 0;
}

/* 顶部按钮栏容器 */
.panel-header {
    display: flex;
    align-items: center;
    justify-content: left;
    margin-bottom: 20px;
    /* 留出与下方设备卡片的间距 */
    gap: 16px;
}

/* 按钮组包裹盒 */
.btn-group {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-group button {
    padding: 6px 16px;
    border: 1px solid #dcdfe6;
    background: #fff;
    cursor: pointer;
    transition: all 0.3s;
}

.category-title {
    width: 90px;
    flex-shrink: 0;
}

.category-title h3 {
    margin: 0;
    font-size: 16px;
    color: #303133;
}

.btn-group button.active {
    background-color: #409eff;
    color: #ffffff;
    border-color: #409eff;
}
</style>
