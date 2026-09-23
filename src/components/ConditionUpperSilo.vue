<template>
  <span>❄️ 降低表层粮温 - 触发条件设置</span>
  <div class="condition-box">

    <div class="form-item">
      <label>目标整体降温温差 (表层平均 - 仓外) >= </label>
      <input type="number" v-model="localStart.minTotalTempDiff" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>仓内湿度 >= </label>
      <input type="number" v-model="localStart.maxMoisture" step="0.1" /> %
    </div>
    <!-- <div class="form-item">
      <label>策略运行模式:</label>
      <select v-model="startCondition.economyMode">
        <option value="economy">经济优先 (限谷电/绿电)</option>
        <option value="performance">时效优先 (全天候触发)</option>
      </select>
    </div> -->
  </div>


  <span>❄️ 降低表层粮温 - 结束条件设置</span>
  <div class="condition-box">

    <div class="form-item">
      <label>目标整体降温温差 (表层平均 - 仓外) < </label>
          <input type="number" v-model="localEnd.minTotalTempDiff" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>仓内湿度 < </label>
          <input type="number" v-model="localEnd.maxMoisture" step="0.1" /> %
    </div>
    <!-- <div class="form-item">
      <label>策略运行模式:</label>
      <select v-model="endCondition.economyMode">
        <option value="economy">经济优先 (限谷电/绿电)</option>
        <option value="performance">时效优先 (全天候触发)</option>
      </select>
    </div> -->
  </div>
</template>

<script setup>
import { onMounted, reactive, watch } from 'vue'
import { useVentiUpperSiloStore } from '../store/VentiUpperSilo.js'
// const props = defineProps({
//   modelValue: Object
// })
const props = defineProps({
  start: Object,
  end: Object
})
const emit = defineEmits(['update:start', 'update:end'])

// const startCondition = reactive({
//   minTotalTempDiff: 2.0,
//   maxMoistureLoss: 70,
// })

// const endCondition = reactive({
//   minTotalTempDiff: 1.0,
//   maxMoistureLoss: 55,
// })

const store = useVentiUpperSiloStore()
// 本地副本
const localStart = reactive({ ...store.startCondition })
const localEnd = reactive({ ...store.endCondition })


// 4. 分别监听两组数据的变化，并实时吐给父组件
watch(localStart, (newVal) => {
  emit('update:start', { ...newVal })
}, { deep: true })

watch(localEnd, (newVal) => {
  emit('update:end', { ...newVal })
}, { deep: true })



// 深度监听开启条件，变化时直接赋值给 store 的对应属性
watch(localStart, (newVal) => {
  console.log('localstart',newVal)
  store.startCondition = { ...newVal }
}, { deep: true })

// 深度监听关闭条件
watch(localEnd, (newVal) => {
  store.endCondition = { ...newVal }
}, { deep: true })


onMounted(()=>{
  emit('update:start', localStart)
  emit('update:end', localEnd)
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
