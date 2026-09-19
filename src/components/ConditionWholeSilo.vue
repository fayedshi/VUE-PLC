<template>
  <div class="condition-box">
    <h3>❄️ 降低整仓粮温 - 触发条件设置</h3>
    <div class="form-item">
      <label>目标整体降温温差 (整仓平均 - 仓外):</label>
      <input type="number" v-model="formData.minTotalTempDiff" step="0.1" /> ℃
    </div>
    <div class="form-item">
      <label>保墒控水允许最大 EMC 偏差值:</label>
      <input type="number" v-model="formData.maxMoistureLoss" step="0.1" /> %
    </div>
    <div class="form-item">
      <label>策略运行模式:</label>
      <select v-model="formData.economyMode">
        <option value="economy">经济优先 (限谷电/绿电)</option>
        <option value="performance">时效优先 (全天候触发)</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: Object
})
const emit = defineEmits(['update:modelValue'])

const formData = reactive({
  minTotalTempDiff: 6.0,
  maxMoistureLoss: 0.3,
  economyMode: 'economy',
  ...props.modelValue
})

watch(formData, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })
</script>

<style scoped>
.condition-box {
  border: 1px solid #2196f3;
  padding: 15px;
  border-radius: 8px;
  background: #e3f2fd;
}

.form-item {
  margin-bottom: 12px;
}
</style>
