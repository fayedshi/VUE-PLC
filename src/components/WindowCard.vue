<template>
    <el-card class="window-card" shadow="hover" :body-style="{ padding: '12px' }">
        <!-- 卡片头部：窗户编号及状态 -->
        <template #header>
            <div class="card-header">
                <span class="title">
                    <el-icon>
                        <Compass />
                    </el-icon> 窗 #{{ data.id }}
                </span>
                <el-tag :type="getWindowTagType(data.window.status)" effect="dark">
                    {{ formatStatus('window', data.window.status) }}
                </el-tag>
            </div>
        </template>

        <!-- 1. 窗体控制 -->
        <div class="control-row">
            <!-- <span class="label">窗体动作:</span> -->
            <el-button-group size="small">
                <el-button type="primary" @click="onControl('window', data.window.id, 'open')">开窗</el-button>
                <el-button type="danger" @click="onControl('window', data.window.id, 'close')">关窗</el-button>
                <el-button type="info" @click="onControl('window', data.window.id, 'stop')">停止</el-button>
            </el-button-group>
        </div>

        <!-- 2. 排风扇控制 (条件渲染) -->
        <div v-if="data.fan" class="sub-device-section fan-section">
            <div class="sub-header">
                <span class="sub-title">💨 排风扇 #{{ data.fan.id }}</span>
                <el-tag :type="data.fan.status === 'open' ? 'success' : 'info'" size="small">
                    {{ data.fan.status === 'open' ? '运行中' : '已停止' }}
                </el-tag>
            </div>
            <el-button-group size="small" class="w-full">
                <el-button type="success" plain @click="onControl('fan', data.fan.id, 'open')">开启</el-button>
                <el-button type="warning" plain @click="onControl('fan', data.fan.id, 'close')">关闭</el-button>
                <el-button type="info" plain @click="onControl('fan', data.fan.id, 'stop')">停止</el-button>
            </el-button-group>
        </div>

        <!-- 3. 风机控制 (条件渲染) -->
        <div v-if="data.blower" class="sub-device-section blower-section">
            <div class="sub-header">
                <span class="sub-title">🌀 风机 #{{ data.blower.id }}</span>
                <el-tag :type="getBlowerTagType(data.blower.status)" size="small">
                    {{ formatStatus('blower', data.blower.status) }}
                </el-tag>
            </div>
            <el-button-group size="small">
                <el-button type="primary" plain @click="onControl('blower', data.blower.id, 'forward')">正转</el-button>
                <el-button type="success" plain @click="onControl('blower', data.blower.id, 'reverse')">反转</el-button>
                <el-button type="info" plain @click="onControl('blower', data.blower.id, 'stop')">停止</el-button>
            </el-button-group>
        </div>
    </el-card>
</template>

<script setup>
import { Compass } from '@element-plus/icons-vue'

defineProps({
    data: { type: Object, required: true }
})

const emit = defineEmits(['action'])

const onControl = (type, id, action) => {
    emit('action', { type, id, action })
}

// 状态文字格式化
const formatStatus = (type, status) => {
    const map = {
        window: { open: '已打开', close: '已关闭', stop: '已停止' },
        blower: { forward: '正转中', reverse: '反转中', stop: '已停止' }
    }
    return map[type]?.[status] || status
}

// 动态计算 Element Plus 标签颜色
const getWindowTagType = (status) => {
    if (status === 'open') return 'success'
    if (status === 'close') return 'info'
    return 'warning'
}

const getBlowerTagType = (status) => {
    if (status === 'forward') return 'primary'
    if (status === 'reverse') return 'success'
    return 'info'
}
</script>

<style scoped>
.window-card {
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header .title {
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 6px;
}

.control-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.label {
    font-size: 14px;
    color: #606266;
}

.sub-device-section {
    margin-top: 15px;
    padding-top: 12px;
    border-top: 1px dashed #e4e7ed;
}

.sub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.sub-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
}
</style>
