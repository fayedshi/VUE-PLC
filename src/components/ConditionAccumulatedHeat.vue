<template>
  <div class="condition-box">
    <h3>🔥 排积热通风 - 触发条件设置</h3>
    <div class="form-item">
      <label>开启温差阈值 (仓内空间 - 仓外干球):</label>
      <input type="number" v-model="formData.tempDiff" step="0.1" /> ℃
    </div>
    <div class="form-item">
      <label>防结露安全裕度 (表层粮温 - 外界露点):</label>
      <input type="number" v-model="formData.dewPointMargin" step="0.1" /> ℃
    </div>
    <div class="form-item">
      <label>禁止通风最大外界湿度:</label>
      <input type="number" v-model="formData.maxOutsideRh" /> %
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: Object
})
const emit = defineEmits(['update:modelValue'])

// 使用 reactive 绑定表单数据
const formData = reactive({
  tempDiff: 3.0,
  dewPointMargin: 2.0,
  maxOutsideRh: 80,
  ...props.modelValue // 如果有初始值则覆盖
})

// 向上同步数据给父组件
watch(formData, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })

</script>

<style scoped>
.condition-box {
  border: 1px solid #ff9800;
  padding: 15px;
  border-radius: 8px;
  background: #fff5e6;
}

.form-item {
  margin-bottom: 12px;
}
</style>
