<template>
  <div class="report-container">
    <!-- 1. 时间查询工具栏 -->
    <div class="search-bar">
      <div class="search-item">
        <label>选择历史查询时间：</label>
        <!-- 使用 datetime-local 方便用户精确选择到分钟 -->
        <input type="datetime-local" v-model="searchQuery.dateTime" class="input-date" />
      </div>
      <button class="btn-search" :disabled="isLoading" @click="handleSearch">
        {{ isLoading ? '查询中...' : '🔍 查询' }}
      </button>
      <button class="btn-reset" :disabled="isLoading" @click="resetSearch">
        🔄 恢复最新数据
      </button>
      <label>检测时间：</label>{{ localTime }}
    </div>

    <!-- 2. 数据报表表格区域 (35行) -->
    <div class="table-wrapper">
      <!-- Loading 加载状态遮罩层 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在读取 PLC 温度数据，请稍候...</p>
      </div>

      <table class="temp-table">
        <thead>
          <tr>
            <th>电缆编号</th>
            <th>表层温度</th>
            <th>中上层温度</th>
            <th>中下层温度</th>
            <th>底层温度</th>
          </tr>
        </thead>
        <tbody>
          <!-- 循环渲染 35 行电缆数据 -->
          <tr v-for="cable in processedCables" :key="cable.id">
            <td class="cable-id-td">电缆 {{ cable.id }}</td>
            <td class="temp-td" :class="getTempClass(cable.surface)">{{ formatTemp(cable.surface) }}</td>
            <td class="temp-td" :class="getTempClass(cable.midUpper)">{{ formatTemp(cable.midUpper) }}</td>
            <td class="temp-td" :class="getTempClass(cable.midLower)">{{ formatTemp(cable.midLower) }}</td>
            <td class="temp-td" :class="getTempClass(cable.bottom)">{{ formatTemp(cable.bottom) }}</td>
          </tr>
          <tr>
            统计
          </tr>
          <tr>
          <td class="cable-id-td">最低 </td>
          <td>{{ formatTemp(surfaceMin / 10) }}</td>
          <td>{{ formatTemp(midUpperMin / 10) }}</td>
          <td>{{ formatTemp(midLowerMin / 10) }}</td>
          <td>{{ formatTemp(bottomMin / 10) }}</td>
          </tr>
          <tr>
          <td class="cable-id-td">最高 </td>
          <td>{{ formatTemp(surfaceMax / 10) }}</td>
          <td>{{ formatTemp(midUpperMax / 10) }}</td>
          <td>{{ formatTemp(midLowerMax / 10) }}</td>
          <td>{{ formatTemp(bottomMax / 10) }}</td>
          </tr>

          <!-- 数据为空时的缺省提示 -->
          <tr v-if="!isLoading && processedCables.length === 0">
            <td colspan="5" class="no-data">当前选定时间段暂无温度记录，请重新选择时间查询</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'


// 响应式数据：存储原始 JSON 对象数据
const temp_cache = ref({})
const isLoading = ref(false)
const localTime = ref()
// 查询表单数据
const searchQuery = ref({
  dateTime: ''
})

const http = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 5000
});

/**
 * 核心请求函数：通过 Axios 异步加载温度数据
 * @param {String} formattedTime 转换后的标准时间字符串 YYYY-MM-DD HH:mm:ss
 */
const fetchTemperatureData = async (formattedTime = '') => {
  isLoading.value = true
  try {
    const response = await http.get('/api/tempbytime', {
      params: {
        input_time: formattedTime
      }
    });
    // console.log('ui response',response.data)
    temp_cache.value = response.data
    console.log('time', temp_cache.value['time'])
    localTime.value = new Date(temp_cache.value['time'].replace(/\.\d+/, '') + 'Z').toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false
    });
    console.log('local time', localTime.value)
  } catch (err) {
    console.error('获取数据异常:', err)
  } finally {
    isLoading.value = false
  }
}


const surfaceMax = ref(-50)
const midUpperMax = ref(-50)
const midLowerMax = ref(-50)
const bottomMax = ref(-50)

const surfaceMin = ref(1000)
const midUpperMin = ref(1000)
const midLowerMin = ref(1000)
const bottomMin = ref(1000)


/**
 * 数据解构计算属性：将平铺的 temp0 ~ temp139 对象解析为 35 行表格结构
 */
const processedCables = computed(() => {
  const cables = []
  const cache = temp_cache.value

  if (!cache || Object.keys(cache).length === 0) return []

  for (let i = 0; i < 35; i++) {
    const base = i * 4 // 电缆对应的数据下标基准点
    cables.push({
      id: i + 1, // 电缆 1 到 35
      surface: (cache[`temp${base}`] / 10).toFixed(1),     // temp0, temp4, temp8...
      midUpper: (cache[`temp${base + 1}`] / 10).toFixed(1), // temp1, temp5, temp9...
      midLower: (cache[`temp${base + 2}`] / 10).toFixed(1), // temp2, temp6, temp10...
      bottom: (cache[`temp${base + 3}`] / 10).toFixed(1)  // temp3, temp7, temp11...
    })
    
    
    // alert(rem)
    switch (i % 4 ) {
      case 0:
        surfaceMin.value = Math.min(surfaceMin.value, cache[`temp${i}`])
        surfaceMax.value = Math.max(surfaceMax.value, cache[`temp${i}`])
        break
        // console.log('surfaceMin', surfaceMin.value)
        // console.log('surfaceMax', surfaceMax.value)
      case 1:
        console.log('midUpper ',i)
        console.log('cache[`temp${i}`]', cache[`temp${i}`],' i is ',i)
        midUpperMin.value = Math.min(midUpperMin.value, cache[`temp${i}`])
        midUpperMax.value = Math.max(midUpperMax.value, cache[`temp${i}`])
        console.log('midUpperMin', midUpperMin.value)
        break
      case 2:
        midLowerMin.value = Math.min(midLowerMin.value, cache[`temp${i}`])
        midLowerMax.value = Math.max(midLowerMax.value, cache[`temp${i}`])
        break
      case 3:
        bottomMin.value = Math.min(bottomMin.value, cache[`temp${i}`])
        bottomMax.value = Math.max(bottomMax.value, cache[`temp${i}`])
        break
      default:
        break
      // return
    }
  }
  console.log('after loop', surfaceMin.value)
  // surfaceMax.value = (surfaceMax.value / 10).toFixed(1)
  // midUpperMax.value = (midUpperMax.value / 10).toFixed(1)
  // midLowerMax.value = (midLowerMax.value / 10).toFixed(1)
  // bottomMax.value = (bottomMax.value / 10).toFixed(1)

  // surfaceMin.value = (surfaceMin.value / 10).toFixed(1)
  // midUpperMin.value = (midUpperMin.value / 10).toFixed(1)
  // midLowerMin.value = (midLowerMin.value / 10).toFixed(1)
  // bottomMin.value = (bottomMin.value / 10).toFixed(1)
  return cables
})

/**
 * 点击“🔍 查询”按钮触发的逻辑
 */
const handleSearch = () => {
  if (!searchQuery.value.dateTime) {
    alert('请先选择要查询的日期和具体时间！')
    return
  }

  // 💡 避坑处理：datetime-local 默认格式是 "2026-08-11T14:30" 
  // 此处通过正则和拼接，将其自动格式化为后端数据库标准的 "2026-08-11 14:30:00"
  const rawTime = searchQuery.value.dateTime
  console.log(rawTime)
  const formattedTime = rawTime

  console.log('发起历史时间点查询：', formattedTime)
  fetchTemperatureData(formattedTime)
}

/**
 * 点击“恢复实时数据”按钮
 */
const resetSearch = () => {
  searchQuery.value.dateTime = ''
  fetchTemperatureData() // 传空代表请求当前最新实时数据
}

/**
 * 页面生命周期：进入报表页时，默认拉取最新的温度数据
 */
onMounted(() => {
  fetchTemperatureData()
})

/**
 * 文本格式化工具
 */
const formatTemp = (val) => {
  return val !== undefined && val !== null ? `${Number(val).toFixed(1)} ℃` : '--'
}

/**
 * 工业温度预警样式计算（可根据实际粮情或工况修改报警温度）
 */
const getTempClass = (val) => {
  if (val === undefined || val === null) return ''
  if (val > 35.0) return 'temp-high' // 超过35度高温报警
  if (val < 5.0) return 'temp-low'   // 低于5度低温警示
  return 'temp-normal'
}
</script>

<style scoped>
.report-container {
  /* padding: 0px; */
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

h2 {
  margin-bottom: 20px;
  font-weight: 600;
  color: #1e293b;
}

/* 查询工具栏样式 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  background: #f8fafc;
  padding: 5px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #475569;
}

.input-date {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
  color: #334155;
  background: #ffffff;
}

.input-date:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.btn-search {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-search:hover {
  background: #2563eb;
}

.btn-search:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btn-reset {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-reset:hover {
  background: #f1f5f9;
}

.btn-reset:disabled {
  background: #f1f5f9;
  color: #cbd5e1;
  cursor: not-allowed;
}

/* 表格区域及遮罩样式 */
.table-wrapper {
  position: relative;
  /* 核心：为 loading 遮罩层提供定位基准 */
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 35行数据表格样式 */
.temp-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}

.temp-table th {
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  padding: 14px 12px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 14px;
}

.temp-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.temp-table tbody tr:hover {
  background: #f8fafc;
}

.cable-id-td {
  font-weight: 600;
  color: #1e293b;
  background: #f8fafc;
  width: 16%;
  border-right: 1px solid #e2e8f0;
}

.temp-td {
  width: 21%;
}

/* 温度阈值状态色 */
.temp-normal {
  color: #10b981;
  font-weight: 500;
}

/* 正常绿色 */
.temp-high {
  color: #ef4444;
  font-weight: bold;
  background: #fef2f2;
}

/* 高温红色背景醒目 */
.temp-low {
  color: #3b82f6;
  font-weight: 500;
}

/* 低温蓝色 */
.no-data {
  padding: 40px;
  color: #94a3b8;
  font-size: 14px;
}
</style>
