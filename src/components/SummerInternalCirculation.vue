<template>
  <span>❄️ 夏季内循环 - 触发条件设置（AND 条件）</span>
  <div class="condition-box">

    <div class="form-item">
      <label>表层粮温 - 底层平均粮温 >= </label>
      <input type="number" v-model="startCondition.minTotalTempDiff" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>仓内湿度 < </label>
          <input type="number" v-model="startCondition.maxMoisture" step="0.1" /> %
    </div>
    <!-- <div class="form-item">
      <label>策略运行模式:</label>
      <select v-model="startCondition.economyMode">
        <option value="economy">经济优先 (限谷电/绿电)</option>
        <option value="performance">时效优先 (全天候触发)</option>
      </select>
    </div> -->
  </div>

  <span>❄️ 夏季内循环 - 结束条件设置（OR 条件）</span>
  <div class="condition-box">

    <div class="form-item">
      <label>表层粮温 - 底层平均粮温 < </label>
          <input type="number" v-model="endCondition.minTotalTempDiff" step="0.1" /> ℃
    </div>
    <span class="join">OR</span>
    <div class="form-item">
      <label>仓内湿度 > </label>
      <input type="number" v-model="endCondition.maxMoisture" step="0.1" /> %
    </div>
    <span class="join">OR</span>
    <div class="form-item">
      <label>底层平均粮温 >= </label>
      <input type="number" v-model="endCondition.bottomGrainAvgTemp" step="0.1" /> %
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, watch } from 'vue'
// import { useVentiUpperSiloStore } from '../store/VentiUpperSilo.js'
// const props = defineProps({
//   modelValue: Object
// })
const props = defineProps({
  start: Object,
  end: Object
})
const emit = defineEmits(['update:start', 'update:end'])

const startCondition = reactive({
  minTotalTempDiff: 3.0,
  maxMoisture: 68,
})

const endCondition = reactive({
  minTotalTempDiff: 1.5,
  maxMoisture: 55,
  bottomGrainAvgTemp: 18
})

// const store = useVentiUpperSiloStore()
// 本地副本
// const startCondition = reactive({ ...store.startCondition })
// const endCondition = reactive({ ...store.endCondition })


// 4. 分别监听两组数据的变化，并实时吐给父组件
watch(startCondition, (newVal) => {
  emit('update:start', { ...newVal })
}, { deep: true })

watch(endCondition, (newVal) => {
  emit('update:end', { ...newVal })
}, { deep: true })



// 深度监听开启条件，变化时直接赋值给 store 的对应属性
// watch(startCondition, (newVal) => {
//   console.log('startCondition',newVal)
//   store.startCondition = { ...newVal }
// }, { deep: true })

// // 深度监听关闭条件
// watch(endCondition, (newVal) => {
//   store.endCondition = { ...newVal }
// }, { deep: true })


onMounted(() => {
  emit('update:start', startCondition)
  emit('update:end', endCondition)
})
</script>

<style scoped>
.condition-box {
  display: flex;
  border: 1px solid #2196f3;
  padding: 15px;
  border-radius: 8px;
  background: #e3f2fd;
}

.join {
  margin: 0 7px;
  color: red;
}

.form-item {
  margin-bottom: 12px;
}
</style>
