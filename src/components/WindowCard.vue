<template>
    <el-card class="window-card" shadow="hover" :body-style="{ padding: '12px' }">
        <!-- 卡片头部：窗户编号及状态 -->
        <template #header v-if="'fan' in data">
            <div class="card-header">
                <span class="title">
                    <el-icon>
                        <Compass />
                        <!-- </el-icon>{{ data.blower ? '门' : '窗' }} #{{ seqNo }} -->
                    </el-icon>窗 #{{ seqNo }}
                </span>
                <el-tag :class="['status-badge', `status-${data.status}`]" size="small">
                    {{ formatStatus('window', data.status) }}
                </el-tag>

                <!-- <el-tag :type="data.status === 1 ? 'success' : 'info'" size="small" effect="dark">
                    {{ formatStatus('window', data.status) }}
                </el-tag> -->
                <!-- <span :class="['status-badge', `status-${data.status}`]">
                    {{ formatStatus('window', data.status) }}
                </span> -->

            </div>
        </template>
        <!-- <template v-else #header>
            <div class="card-header">
                <span class="title">❄️ 空调 #{{ data.index }}</span>
                <el-tag :type="data.status == 1 ? 'success' : 'info'" size="small">
                    {{ formatStatus('ac', data.status) }}
                </el-tag>
            </div>
        </template> -->

        <!-- 1. 窗体控制 -->
        <div class="control-row" v-if="'fan' in data">
            <!-- <span class="label">窗体动作:</span> -->
            <el-button-group size="small">
                <el-button :type="data.blower ? 'primary' : 'success'" :disabled="[1, 4].includes(data.status)"
                    @click="onControl('window', data.id, WindowActionEnum.OPEN)">开窗</el-button>
                <el-button :disabled="checkDevState"
                    @click="onControl('window', data.id, WindowActionEnum.CLOSE)">关窗</el-button>
                <el-button @click="onControl('window', data.id, WindowActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>
        <!-- 4. 空调控制 -->
        <div v-else class="sub-device-section ac-section">
            <div class=" sub-header">
                <span class="sub-title">❄️ 空调 #{{ seqNo }}</span>
                <el-tag :type="data.status == 1 ? 'success' : 'info'" size="small">
                    {{ formatStatus('ac', data.status) }}
                </el-tag>
            </div>

            <el-button-group size="small">
                <el-button type="warning" :disabled="data.status == 1" plain
                    @click="onControl('ac', data.id, AcActionEnum.START)">开启</el-button>
                <el-button type="info" plain @click="onControl('ac', data.id, AcActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>

        <!-- 2. 排风扇控制 (条件渲染) -->
        <div v-if="data.fan" class="sub-device-section fan-section">
            <div class="sub-header">
                <span class="sub-title">💨 排风扇 #{{ data.fan.index }}</span>
                <!-- <el-tag :type="data.fan.status === 1 ? 'success' : 'info'" size="small"> -->
                <el-tag :class="['status-badge', `status-${data.fan.status}`]" size="small">
                    {{ formatStatus('fan', data.fan.status) }}
                </el-tag>
            </div>
            <el-button-group size="small" class="w-full">
                <el-button type="success" :disabled="data.fan.status == 1 || data.status != 4" plain
                    @click="onControl('fan', data.fan.id, FanActionEnum.START)">开启</el-button>
                <!-- <el-button type="warning" plain
                    @click="onControl('fan', data.fan.id, FanActionEnum.CLOSE)">关闭</el-button> -->
                <el-button type="info" plain @click="onControl('fan', data.fan.id, FanActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>

        <!-- 3. 风机控制 (条件渲染) -->
        <div v-else-if="data.blower" class="sub-device-section blower-section">
            <div class="sub-header">
                <span class="sub-title">🌀 风机 #{{ data.blower.index }}</span>
                <!-- <el-tag :type="getBlowerTagType(data.blower.status)" size="small"> -->
                <el-tag :class="['status-badge', `status-${data.blower.status}`]" size="small">
                    {{ formatStatus('blower', data.blower.status) }}
                </el-tag>
                <!-- <span :class="['status-badge', `status-${data.blower.status}`]">
                    {{ formatStatus('blower', data.blower.status) }}
                </span> -->
            </div>

            <el-button-group size="small">
                <el-button type="primary" :disabled="data.blower.status == 1 || data.status != 4" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.FORWARD)">正转</el-button>
                <el-button type="success" :disabled="data.blower.status == 2 || data.status != 4" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.REVERSE)">反转</el-button>
                <el-button type="info" plain
                    @click="onControl('blower', data.blower.id, BlowerActionEnum.STOP)">停止</el-button>
            </el-button-group>
        </div>
    </el-card>
</template>

<script setup>
import { Compass } from '@element-plus/icons-vue'
import { useWindowControlStore, WindowActionEnum, AcState, FanActionEnum, BlowerActionEnum, AcActionEnum } from '../store/WindowControl'
import { computed } from 'vue';
import { number } from 'echarts';
const MyAcState = AcState;
const props = defineProps({
    data: { type: Object, required: true },
    seqNo: { typpe: number, required: false }
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
    let statusVal = map[type]?.[status] || '未知'
    // console.log('status val:', statusVal)
    return statusVal
}

const isAcDevice = computed(() => {
    console.log('ac: ', props.data, 'is ac:', props.data instanceof MyAcState)
    return props.data instanceof AcState;
});

// check if window can shut
const checkDevState = computed(() => {
    // console.log('check dev state:', props.data)
    let window = props.data
    let result = [2, 5].includes(window.status)
    if (window.fan) {
        result ||= window.fan.status == 1
    }
    if (window.blower) {
        result ||= [1, 2].includes(window.blower.status)
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

.status-badge {
    font-size: 11px;
    padding: 1px 4px;
    /* border-radius: 3px; */
    background: #f4f4f5;
    color: #909399;
    border: none !important;
    /* 强制文字颜色为白色 */
    /* color: #fff !important; */
    /* 核心：强制覆盖 el-tag 的默认圆角为 3px */
    border-radius: 10px !important;

}




.status-0 {
    background: #cfc8c3;
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
</style>
