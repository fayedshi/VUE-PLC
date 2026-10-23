<template>
    <div class="house-select-container">
        <label class="section-label">选择仓房：</label>

        <el-select clearable v-model="modelValue" placeholder="请选择"  style="width: 100px" @change="handleHouseChange">
            <!-- 循环渲染 el-option -->
            <el-option v-for="houseCode in houseCodeList" :key="houseCode" :label="houseCode" :value="houseCode" />
        </el-select>
    </div>

</template>

<script setup>
import { ref, onMounted, computed, } from 'vue'
import axios from 'axios'

// 1. 声明 v-model，父组件传入的值会绑定到 modelValue，默认值为 '001'
const modelValue = defineModel({ type: [String, null], default: '' })

// 2. 如果您的 Vue 版本低于 3.4，请解开下方注释，并把 template 里的 modelValue 改为 localValue

// const props = defineProps(['modelValue'])
// const emit = defineEmits(['update:modelValue', 'change'])
// const localValue = computed({
//   get: () => props.modelValue,
//   set: (val) => emit('update:modelValue', val)
// })


// 仅保留仓房列表数据
const houseCodeList = ref([])

onMounted(async () => {
    try {
        const result = await axios.get('http-api/api/houses/codes')
        houseCodeList.value = result.data
        console.log(' house cod list', houseCodeList.value)
    } catch (error) {
        console.error('获取仓房列表失败:', error)
    }
})

// 定义一个可选的 change 事件，方便父组件在切换时触发特定函数
const emit = defineEmits(['change'])
const handleHouseChange = () => {
    emit('change', modelValue.value)
}
</script>

<style scoped>
.house-select-container {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}


.section-label {
    font-size: 14px;
    font-weight: 600;
    color: #475569;
}

.native-select {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    margin-right: 20px;
}
</style>
