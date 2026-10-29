<template>
    <el-card class="window-card" shadow="hover" :body-style="{ padding: '12px' }">
        <!-- 卡片头部：窗户编号及状态 -->
        <template #header v-if="data.window">
            <div class="card-header">
                <span class="title">
                    <el-icon>
                        <Compass />
                    </el-icon> {{ data.label }} #{{ data.window.index }}
                </span>
                <el-tag :type="getWindowTagType(data.window.status)" effect="dark">
                    {{ formatStatus('window', data.window.status) }}
                </el-tag>
            </div>
        </template>

        <!-- 1. 窗体控制 -->
        <div class="control-row" v-if="data.window">
            <!-- <span class="label">窗体动作:</span> -->
            <el-button-group size="small">
                <el-button :type="data.blower ? 'primary' : 'success'" :disabled="[1, 4].includes(data.window.status)"
                    @click="onControl('window', data.window.id, WindowActionEnum.OPEN)">开窗</el-button>
                <el-button :disabled="checkDevState"
                    @click="onControl('window', data.window.id, WindowActionEnum.CLOSE)">关窗</el-button>
                <el-button @click="onControl('window', data.window.id, WindowActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>

        <!-- 2. 排风扇控制 (条件渲染) -->
        <div v-if="data.fan" class="sub-device-section fan-section">
            <div class="sub-header">
                <span class="sub-title">💨 排风扇 #{{ data.fan.index }}</span>
                <el-tag :type="data.fan.status === 'open' ? 'success' : 'info'" size="small">
                    {{ formatStatus('fan', data.fan.status) }}
                </el-tag>
            </div>
            <el-button-group size="small" class="w-full">
                <el-button type="success" :disabled="data.fan.status == 1 || data.window.status != 4" plain
                    @click="onControl('fan', data.fan.id, FanActionEnum.OPEN)">开启</el-button>
                <!-- <el-button type="warning" plain
                    @click="onControl('fan', data.fan.id, FanActionEnum.CLOSE)">关闭</el-button> -->
                <el-button type="info" plain @click="onControl('fan', data.fan.id, FanActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>

        <!-- 3. 风机控制 (条件渲染) -->
        <div v-if="data.blower" class="sub-device-section blower-section">
            <div class="sub-header">
                <span class="sub-title">🌀 风机 #{{ data.blower.index }}</span>
                <el-tag :type="getBlowerTagType(data.blower.status)" size="small">
                    {{ formatStatus('blower', data.blower.status) }}
                </el-tag>
            </div>

            <el-button-group size="small">
                <el-button type="primary" :disabled="data.blower.status == 1 || data.window.status != 4" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.FORWARD)">正转</el-button>
                <el-button type="success" :disabled="data.blower.status == 2 || data.window.status != 4" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.REVERSE)">反转</el-button>
                <el-button type="info" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>

        <!-- 3. 空调控制 -->
        <div v-if="data.ac" class="sub-device-section ac-section"">
            <div class=" sub-header">
            <span class="sub-title">❄️ 空调 #{{ data.ac.index }}</span>
            <el-tag :type="getBlowerTagType(data.ac.status)" size="small">
                {{ formatStatus('ac', data.ac.status) }}
            </el-tag>
        </div>

        <el-button-group size="small">
            <el-button type="warning" :disabled="data.ac.status == 1" plain @click="onControl('ac', data.ac.id, AcActionEnum.START)">开启</el-button>
            <el-button type="info" plain @click="onControl('ac', data.ac.id, 'stop')">停止</el-button>
        </el-button-group>
        </div>
    </el-card>
</template>

<script setup>
import { Compass } from '@element-plus/icons-vue'
import { useWindowControlStore, WindowActionEnum, FanActionEnum, BlowerActionEnum, AcActionEnum } from '../store/WindowControl.ts' 
import { computed } from 'vue';

const props = defineProps({
    data: { type: Object, required: true }
})

const emit = defineEmits(['action'])

const onControl = (type, id, action) => {
    emit('action', { type, id, action })
}

// const store = useWindowControlStore()
// 状态文字格式化
//  winDoorStatusMap = { 0: '初始化', 1: '正在打开', 2: '正在关闭', 3: '停', 4: '开到位', 5: '关到位', 6: '故障' }
//  fanStatusMap = { 0: '初始化', 1: '正转', 2: '反转', 3: '停', 6: '故障' }
//  exhaustStatusMap = { 0: '初始化', 1: '正在开启', 3: '停', 6: '故障' }
const formatStatus = (type, status) => {
    const map = {
        window: { 0: '初始化', 1: '正在打开', 2: '正在关闭', 3: '停', 4: '开到位', 5: '关到位', 6: '故障' },
        fan: { 0: '初始化', 1: '正在开启', 3: '停', 6: '故障' },
        blower: { 0: '初始化', 1: '正转', 2: '反转', 3: '停', 6: '故障' },
        ac: { 0: '停止', 1: '运行' }
    }
    let statusVal = map[type]?.[status] || status
    // console.log('status val:', statusVal)
    return statusVal
}

// check if window can shut
const checkDevState = computed(() => {
    // console.log('check dev state:', props.data)
    let dev = props.data
    let result = [2, 5].includes(dev.window.status)
    if (dev.fan) {
        result ||= dev.fan.status == 1
    }
    if (dev.blower) {
        result ||= [1, 2].includes(dev.blower.status)
    }
    return result
})


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
    background-color: aliceblue;
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
