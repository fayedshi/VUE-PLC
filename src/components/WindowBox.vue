<template>
    <el-card class="window-card" shadow="hover">
        <!-- 卡片头部：窗户 -->
        <template #header v-if="data.window">
            <div class="card-header">
                <span class="title">
                    <el-icon>
                        <!-- <Compass /> -->
                    </el-icon> {{ data.label }} #{{ data.window.index }}
                </span>
                <!-- 💡 绑定窗户的选中状态，改变时触发 handleSelect -->
                <el-checkbox v-model="isSelected.window"
                    @change="handleSelect('window', data.id, WindowActionEnum.OPEN, WindowActionEnum.CLOSE)" />
            </div>
        </template>

        <!-- 2. 排风扇控制 -->
        <div v-if="data.fan" class="sub-device-section fan-section">
            <div class="sub-header">
                <span class="sub-title">
                    💨 排风扇 #{{ data.fan.index }}
                    <!-- 💡 绑定排风扇的选中状态 -->
                    <el-checkbox v-model="isSelected.fan"
                        @change="handleSelect('fan', data.fan.id, FanActionEnum.START, FanActionEnum.STOP)" />
                </span>
            </div>
        </div>

        <!-- 3. 风机控制 (保持你原有的结构) -->
        <div v-if="data.blower" class="sub-device-section blower-section">
            <div class="sub-header">
                <span class="sub-title">🌀 风机 #{{ data.blower.index }}</span>
                <!-- 如果风机也需要勾选，可以仿照上面加 el-checkbox -->
            </div>
            <el-radio-group>
                <el-radio :value="1" @click.prevent="handleSelect('blower',data.fan.id, 1)">正</el-radio>
                <el-radio :value="2" @click.prevent="handleSelect(2)">反</el-radio>
            </el-radio-group>
            <!-- <el-checkbox v-model="isSelected.blowerForward"
                @change="handleSelect('fan', data.fan.id, BlowerActionEnum.FORWARD, FanActionEnum.STOP)">正</el-checkbox>
            <el-checkbox v-model="isSelected.blowerReverse"
                @change="handleSelect('fan', data.fan.id, BlowerActionEnum.REVERSE, FanActionEnum.STOP)">反</el-checkbox> -->
        </div>

        <div v-if="data.ac" class="sub-device-section ac-section">
            <div class=" sub-header">
                <span class="sub-title">❄️ 空调 #{{ data.ac.index }}</span>
                <!-- <el-tag :type="getBlowerTagType(data.ac.status)" size="small">
                    {{ formatStatus('ac', data.ac.status) }}
                </el-tag> -->
                <el-checkbox v-model="isSelected.ac" @change="handleSelect('ac', data.ac.id)" />
            </div>

            <!-- <el-button-group size="small">
                <el-button type="warning" :disabled="data.ac.status == 1" plain
                    @click="onControl('ac', data.ac.id, AcActionEnum.START)">开启</el-button>
                <el-button type="info" plain @click="onControl('ac', data.ac.id, 'stop')">停止</el-button>
            </el-button-group> -->
        </div>
    </el-card>
</template>

<script setup>
import { BlowerActionEnum, FanActionEnum, WindowActionEnum } from '@/store/WindowControl'
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps({
    data: {
        type: Object,
        required: true
    }
})

// 声明向主页面传递的事件
const emit = defineEmits(['device-select', 'action'])

const blowerValue = ref(0)

// 核心拦截函数
const handleRadioClick = (clickedValue) => {
    // 1. 如果点击的值和当前已经选中的值一样 -> 说明用户想“取消选择”
    if (blowerValue.value === clickedValue) {
        blowerValue.value = 0 // 重置为都不选
    } else {
        // 2. 如果点击的是另一个值 -> 正常切换选中项
        blowerValue.value = clickedValue
    }

    // 3. 根据最终的 blowerValue，映射成你需要的枚举或动作
    let currentAction = BlowerActionEnum.STOP // 默认或者 0 的时候是停止

    if (blowerValue.value === 1) {
        currentAction = BlowerActionEnum.FORWARD
    } else if (blowerValue.value === 2) {
        currentAction = BlowerActionEnum.REVERSE
    }
}

// 内部记录当前卡片里各个子设备的勾选状态
const isSelected = ref({
    window: false,
    fan: false,
    blowerForward: false,
    blowerReverse: false,
    ac: false
})

// 当勾选状态改变时，通知主页面
const handleSelect = (type, id, start, stop) => {
    // props.data[type].action=
    // todo: 把data赋值给windowtask, 然后加上start和stop 值， 比如
    // props.data[type].start=start
    // props.data[type].stop=stop

    // objectassign
    emit('device-select', {
        window: props.data, // 父卡片ID
        // deviceType: type,            // 设备类型：'window' | 'fan' 等
        // deviceId: id,                // 设备的具体ID
        checked: isSelected.value[type], // 是勾选(true)还是取消(false)
        // start: start,
        // stop: stop
    })
}

// 风机等按钮的操作反馈
const toggleBlower = (id, direction) => {
    emit('action', { type: 'blower', id, direction })
}
</script>


<style scoped>
.window-card {
    width: 150px;
    height: 150px;
    margin-bottom: 10px;
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
    margin-top: 10px;
    /* padding-top: 12px; */
    border-top: 1px dashed #e4e7ed;
}

.sub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* margin-bottom: 8px; */
}

.sub-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
}
</style>
