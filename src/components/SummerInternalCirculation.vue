<template>
  <div class="cooling-settings-container">
    
    <!-- 區塊一：夏季內循環 - 觸發條件設置（AND 條件） -->
    <el-card class="condition-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="icon">❄️</span>
          <span class="title">夏季內循環 - 觸發條件設置（AND 條件）</span>
        </div>
      </template>
      
      <div class="condition-flex-row">
        <!-- 條件 1 -->
        <div class="form-item-inline">
          <span class="form-label">表層糧溫 - 底層平均糧溫 ≥</span>
          <el-input-number 
            v-model="startCondition.minTotalTempDiff" 
            :step="0.1" 
            :precision="1"
            controls-position="right"
            placeholder="請輸入"
          />
          <span class="unit-text">℃</span>
        </div>

        <!-- 連接標籤 -->
        <el-tag type="info" effect="plain" class="join-tag">同時</el-tag>

        <!-- 條件 2 -->
        <div class="form-item-inline">
          <span class="form-label">倉內濕度 &lt;</span>
          <el-input-number 
            v-model="startCondition.maxMoisture" 
            :step="0.1" 
            :precision="1"
            controls-position="right"
            placeholder="請輸入"
          />
          <span class="unit-text">%</span>
        </div>
      </div>
    </el-card>

    <!-- 區塊二：夏季內循環 - 結束條件設置（OR 條件） -->
    <el-card class="condition-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="icon">❄️</span>
          <span class="title">夏季內循環 - 結束條件設置（OR 條件）</span>
        </div>
      </template>
      
      <div class="condition-flex-row wrap">
        <!-- 條件 1 -->
        <div class="form-item-inline">
          <span class="form-label">表層糧溫 - 底層糧溫 &lt;</span>
          <el-input-number 
            v-model="endCondition.minTotalTempDiff" 
            :step="0.1" 
            :precision="1"
            controls-position="right"
            placeholder="請輸入"
          />
          <span class="unit-text">℃</span>
        </div>

        <!-- 連接標籤 1 -->
        <el-tag type="danger" effect="plain" class="join-tag">或是 (OR)</el-tag>

        <!-- 條件 2 -->
        <div class="form-item-inline">
          <span class="form-label">倉內濕度 &gt;</span>
          <el-input-number 
            v-model="endCondition.maxMoisture" 
            :step="0.1" 
            :precision="1"
            controls-position="right"
            placeholder="請輸入"
          />
          <span class="unit-text">%</span>
        </div>

        <!-- 連接標籤 2 -->
        <el-tag type="danger" effect="plain" class="join-tag">或是 (OR)</el-tag>

        <!-- 條件 3 -->
        <div class="form-item-inline">
          <span class="form-label">底層平均糧溫 ≥</span>
          <el-input-number 
            v-model="endCondition.bottomGrainAvgTemp" 
            :step="0.1" 
            :precision="1"
            controls-position="right"
            placeholder="請輸入"
          />
          <span class="unit-text">℃</span>
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

/* 核心：Flex 行佈局，拋棄網格系統與大框線，改為行內流式排版 */
.condition-flex-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  width: 100%;
}

/* 當 OR 條件太多時，允許在小螢幕自動換行，保持舒適度 */
.condition-flex-row.wrap {
  flex-wrap: wrap;
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

/* 單位樣式 */
.unit-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-left: 6px;
}

/* 數字輸入框固定寬度 */
:deep(.el-input-number) {
  width: 120px;
}

/* 同時 / OR 標籤的全新行內樣式，移除背景裝飾線，純文字與標籤點綴 */
.join-tag {
  height: 28px;
  line-height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

/* 手機板響應式 (RWD) 最佳化 */
@media (max-width: 992px) {
  .condition-flex-row {
    flex-wrap: wrap;
    gap: 12px;
  }
  .form-item-inline {
    width: 100%; /* 手機板時單個項目撐滿，自動換行 */
    justify-content: flex-start;
  }
  .join-tag {
    margin: 4px 0;
  }
}
</style>

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
<!-- 
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
</style> -->
