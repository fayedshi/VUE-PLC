<template>
    <el-card class="window-card" shadow="hover">
        <!-- 卡片头部：窗户 -->
        <!-- <template #header v-if="'fan' in data">
            <div class="card-header">
                <span class="title">
                    <el-icon>
                        
                    </el-icon> 窗 #{{ data.index }}
                </span>
                
                <el-checkbox v-model="isSelected.window"
                    @change="handleSelect('window', WindowActionEnum.OPEN, WindowActionEnum.CLOSE)" />
            </div>
        </template> -->
        <template #header v-if="'fan' in data">
            <div class="card-header-compact">
                <!-- <span class="title-compact"> -->
                <span class="sub-title-compact">
                    <el-icon>
                        <Compass />
                    </el-icon> 窗 #{{ data.index }}
                </span>
                <el-checkbox v-model="isSelected.window" size="small"
                    @change="handleSelect('window', WindowActionEnum.OPEN, WindowActionEnum.CLOSE)" />
            </div>
        </template>
        <template v-else #default>
            <div class="device-row-compact" >
                <span class="sub-title-compact">❄️ 空调 #{{ data.index }}</span>
                <el-checkbox v-model="isSelected.ac" size="small" @change="handleSelect('ac', 1, 2)" />
            </div>
        </template>

        <!-- 2. 排风扇控制 -->
        <div v-if="data.fan" class="device-row-compact">
            <span class="sub-title-compact">💨 排风扇 #{{ data.fan.index }}</span>
            <el-checkbox v-model="isSelected.fan" size="small"
                @change="handleSelect('fan', FanActionEnum.START, FanActionEnum.STOP)" />
        </div>


        <!-- 3. 风机控制 (保持你原有的结构) -->
        <div v-else-if="data.blower" class="device-row-compact">
            <span class="sub-title-compact">🌀 风机 #{{ data.blower.index }}</span>
            <el-radio-group v-model="blowerValue" size="small" class="radio-group-compact">
                <el-radio :value="1" @click.prevent="handleRadioClick(1)">正</el-radio>
                <el-radio :value="2" @click.prevent="handleRadioClick(2)">反</el-radio>
            </el-radio-group>
        </div>
    </el-card>
</template>

<script setup>
import { BlowerActionEnum, FanActionEnum, WindowActionEnum } from '../store/WindowControl'
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps({
    data: {
        type: Object,
        required: true
    }
})

// 声明向主页面传递的事件
const emit = defineEmits(['device-select', 'action'])

const blowerValue = ref(null)

const handleRadioClick = (value) => {
    if (blowerValue.value === value) {
        // 如果點擊的是當前已經選中的按鈕，則取消選取
        blowerValue.value = null
        // props.data.blower.selected = false
    } else {
        // 否則，選中點擊的按鈕
        blowerValue.value = value
        // props.data.blower.selected = true
        // props.data.blower.start = value
        // props.data.blower.stop = BlowerActionEnum.STOP
    }
    handleSelect('blower', value, BlowerActionEnum.STOP)
    console.log('entered raido val,', blowerValue.value)
}

// 内部记录当前卡片里各个子设备的勾选状态
const isSelected = ref({
    window: false,
    fan: false,
    ac: false
})

// 当勾选状态改变时，通知主页面
const handleSelect = (type, start, stop) => {
    if (type == 'window' || type == 'ac') {
        props.data.selected = !props.data.selected
        props.data.start = start
        props.data.stop = stop
    } else {
        if (type == 'blower') {
            props.data[type].selected = (start != null)
        } else {
            props.data[type].selected = !props.data[type].selected
        }
        props.data[type].start = start
        props.data[type].stop = stop
        // update parent as selected
        // if (props.data[type].selected) {
        //     props.data.selected = true
        //     isSelected.value.window = true
        // }

    }
    console.log('after check', props.data)
    // objectassign
    // emit('device-select', {
    //     window: props.data, // 父卡片ID
    //     // deviceType: type,            // 设备类型：'window' | 'fan' 等
    //     // deviceId: id,                // 设备的具体ID
    //     checked: isSelected.value[type], // 是勾选(true)还是取消(false)
    //     // start: start,
    //     // stop: stop
    // })
}

// // 风机等按钮的操作反馈
// const toggleBlower = (id, direction) => {
//     emit('action', { type: 'blower', id, direction })
// }
</script>

<style scoped>
/* 💡 優化 2：寬度稍微縮小，高度改為自適應(min-height)，避免內容塞不下 */
.window-card {
    width: 140px;
    min-height: 45px;
    margin-bottom: 8px;
    background-color: aliceblue;
    display: inline-block;
    /* 方便多個小卡片橫向並排 */
    vertical-align: top;
}

/* 💡 優化 3：利用 Element Plus 的深度選擇器，把 el-card__header 的大間距徹底壓小 */
:deep(.el-card__header) {
    padding: 6px 8px !important;
    border-bottom: 1px solid #e4e7ed;
}

/* 窗戶 Header 排版 */
.card-header-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 112px;
}

.title-compact {
    font-size: 13px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #303133;
}

/* 子設備排版：徹底移除肥厚的 margin 和分隔線，改成緊湊的左右並排 */
.device-row-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* padding: 2px 0; */
    width: 100px;
}

.sub-title-compact {
    font-size: 12px;
    font-weight: 500;
    color: #606266;
    min-width: 70px;
}

/* 風機特殊排版：文字與正反轉按鈕完美擠在同一行 */
.blower-layout {
    gap: 4px;
}

.radio-group-compact {
    margin-left: 10px;
    display: flex;
    min-width: 40px;
    /* gap: 2px; */
}

.window-card :deep(.el-card__body) {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 48px;
    width: 120px;
    padding: 2px 5px;
}
</style>