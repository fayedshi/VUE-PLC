<template>
  <div class="cooling-settings-container">

    <!-- 區塊一：觸發條件 -->
    <el-card class="condition-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="icon">❄️</span>
          <span class="title">降低表層糧溫 - 觸發條件設置</span>
        </div>
      </template>

      <!-- 改用 Flex 行佈局，拋棄網格系統與大框線，改為行內流式排版 -->
      <div class="condition-flex-row">
        <!-- 條件 1 -->
        <div class="form-item-inline">
          <span class="form-label">表層平均 - 倉外 ≥</span>
          <el-input-number v-model="localStart.minTotalTempDiff" :step="0.1" :precision="1" controls-position="right"
            placeholder="請輸入" />
          <span class="unit-text">℃</span>
        </div>

        <!-- 連接標籤（純文字點綴，移除背景橫線） -->
        <el-tag type="info" effect="plain" class="join-tag">同時</el-tag>

        <!-- 條件 2 -->
        <div class="form-item-inline">
          <span class="form-label">倉內濕度 ≥</span>
          <el-input-number v-model="localStart.maxMoisture" :step="0.1" :precision="1" controls-position="right"
            placeholder="請輸入" />
          <span class="unit-text">%</span>
        </div>
      </div>
    </el-card>

    <!-- 區塊二：結束條件 -->
    <el-card class="condition-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="icon">❄️</span>
          <span class="title">降低表層糧溫 - 結束條件設置</span>
        </div>
      </template>

      <div class="condition-flex-row">
        <!-- 條件 1 -->
        <div class="form-item-inline">
          <span class="form-label">表層平均 - 倉外 &lt;</span>
          <el-input-number v-model="localEnd.minTotalTempDiff" :step="0.1" :precision="1" controls-position="right"
            placeholder="請輸入" />
          <span class="unit-text">℃</span>
        </div>

        <!-- 連接標籤 -->
        <el-tag type="info" effect="plain" class="join-tag">同時</el-tag>

        <!-- 條件 2 -->
        <div class="form-item-inline">
          <span class="form-label">倉內濕度 &lt;</span>
          <el-input-number v-model="localEnd.maxMoisture" :step="0.1" :precision="1" controls-position="right"
            placeholder="請輸入" />
          <span class="unit-text">%</span>
        </div>
      </div>
    </el-card>

  </div>
</template>

<style scoped>
/* 最外層容器 */
.cooling-settings-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

/* 卡片標題對齊 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header .title {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

/* 核心：Flex 行佈局，拋棄網格與框線 */
.condition-flex-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  width: 100%;
}

/* 單個輸入項目的行內排版 */
.form-item-inline {
  display: flex;
  align-items: center;
}

/* 文字標籤樣式 */
.form-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  margin-right: 8px;
}

/* 單位樣式（移出 input 內部以符合夏季內循環質感） */
.unit-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-left: 6px;
}

/* 數字輸入框固定寬度 */
:deep(.el-input-number) {
  width: 120px;
}

/* 「同時」標籤改為純粹的行內樣式，移除偽元素橫線 */
.join-tag {
  height: 28px;
  line-height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

/* 手機板響應式 (RWD) 最佳化 */
@media (max-width: 768px) {
  .condition-flex-row {
    flex-wrap: wrap;
    gap: 12px;
  }

  .form-item-inline {
    width: 100%;
    /* 手機板時單個項目撐滿自動換行 */
    justify-content: flex-start;
  }

  .join-tag {
    margin: 4px 0;
  }
}
</style>


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
  console.log('localstart', newVal)
  store.startCondition = { ...newVal }
}, { deep: true })

// 深度监听关闭条件
watch(localEnd, (newVal) => {
  store.endCondition = { ...newVal }
}, { deep: true })


onMounted(() => {
  emit('update:start', localStart)
  emit('update:end', localEnd)
})
</script>

<!-- <style scoped>
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
</style> -->
