<template>
  <span>🔥  触发条件设置</span>
  <div class="condition-box">
    <div class="form-item">
      <label>仓内空间 - 仓外干球 >=</label>
      <input type="number" v-model="formData.tempDiff" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>表层粮温 - 外界露点 >=</label>
      <input type="number" v-model="formData.dewPointMargin" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>禁止通风最大外界湿度:</label>
      <input type="number" v-model="formData.maxOutsideRh" /> %
    </div>
  </div>
  <span>🔥 结束条件设置</span>
  <div class="condition-box">
    <div class="form-item">
      <label>仓内空间 - 仓外干球 >=</label>
      <input type="number" v-model="formData.tempDiff" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
    <div class="form-item">
      <label>表层粮温 - 外界露点 >=</label>
      <input type="number" v-model="formData.dewPointMargin" step="0.1" /> ℃
    </div>
    <span class="join">同时</span>
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
  dewPointMargin: 7.0,
  maxOutsideRh: 80,
  // ...props.modelValue // 如果有初始值则覆盖
})

// 向上同步数据给父组件
watch(formData, (newVal) => {
  emit('update:modelValue', { ...newVal })
  // console.log('child: ',formData.dewPointMargin)
}, { deep: true })

</script>

<style scoped>
.condition-box {
  display: flex;
  /* border: 1px solid #ff9800; */
  padding: 15px;
  border-radius: 8px;
  background: #fff5e6;
}
.join{
  margin: 0 7px;
  color: red;
}

.form-item {
  margin-bottom: 12px;
  /* border: 2px solid #ff9800; */
}
</style>
