<template>
    <div class="control-container" v-loading="store.loading" element-loading-text="正在读取后端拓扑配置...">
        <!-- 顶部状态栏 -->
        <!-- <div class="page-header">
            <h2>🏭 智能窗控与通风设备管理中心</h2>
            <el-alert title="数据联动提示：系统已根据 YAML 拓扑自动映射排风扇 (27-30) 与风机 (19-26) 的从属关系。" type="info" show-icon
                :closable="false" />
        </div> -->

        <!-- 设备网格布局 -->
        <el-row :gutter="20" v-if="store.windowList.length > 0">
            <el-col v-for="item in store.windowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="4">
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
import { onMounted } from 'vue'

const store = useWindowControlStore()

onMounted(() => {
    store.initDeviceConfig()
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

.page-header {
    margin-bottom: 24px;
}

.page-header h2 {
    margin-bottom: 12px;
    color: #303133;
}
</style>
