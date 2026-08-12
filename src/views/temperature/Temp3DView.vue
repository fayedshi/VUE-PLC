<template>
  <div class="trend-container">
    <h2>整仓温度趋势分析（每小时抽样）</h2>

    <!-- 1. 时间范围查询工具栏 -->
    <div class="search-bar">
      <div class="search-item">
        <label>开始时间：</label>
        <input type="datetime-local" v-model="timeRange.startTime" class="input-date" />
      </div>
      <div class="search-item">
        <label>结束时间：</label>
        <input type="datetime-local" v-model="timeRange.endTime" class="input-date" />
      </div>
      <button class="btn-search" :disabled="isLoading" @click="handleSearch">
        {{ isLoading ? '分析中...' : '📊 生成趋势图' }}
      </button>
      <button class="btn-reset" @click="resetTimeRange">🔄 重置三天</button>
    </div>

    <!-- 2. 图表渲染区域 -->
    <div class="chart-wrapper">
      <!-- Loading 遮罩 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在计算整仓 140 个测温点数据，请稍候...</p>
      </div>
      <!-- ECharts 容器 -->
      <div ref="chartRef" class="trend-chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
// 💡 请确保项目已安装 echarts: npm install echarts
import * as echarts from 'echarts'

const chartRef = ref(null)
let myChart = null
const isLoading = ref(false)

// 1. 初始化时间范围：默认展示最近3天的数据
const timeRange = ref({
  startTime: '',
  endTime: ''
})

const initDefaultTime = () => {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  
  // 转换为 datetime-local 输入框需要的格式: YYYY-MM-DDTHH:mm
  timeRange.value.startTime = formatDateToLocal(threeDaysAgo)
  timeRange.value.endTime = formatDateToLocal(now)
}

// 辅助函数：格式化时间给 input 框使用
const formatDateToLocal = (date) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().slice(0, 16)
}

// 2. 初始化 ECharts 实例
const initChart = () => {
  if (chartRef.value) {
    myChart = echarts.init(chartRef.value)
    // 渲染暗色调工业风的基础配置
    myChart.setOption(getBaselineOption([], [], [], []))
  }
}

const http = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 5000
});

// 3. 核心请求逻辑：从后端获取聚合后的三条曲线数据
const fetchTrendData = async () => {
  if (!timeRange.value.startTime || !timeRange.value.endTime) {
    alert('请选择完整的开始和结束时间')
    return
  }

  // 格式化为后端通用的标准时间字符串
  const startFormatted = timeRange.value.startTime.replace('T', ' ') + ':00'
  const endFormatted = timeRange.value.endTime.replace('T', ' ') + ':00'

  // 判断时间先后
  if (new Date(startFormatted) >= new Date(endFormatted)) {
    alert('开始时间必须早于结束时间！')
    return
  }

  isLoading.value = true
  try {
    // 💡 替换为您后端的趋势接口地址
    const url = '/api/temp-trend'
    const response = await http.get(url, {
      params: {
        start_time: timeRange.value.startTime,
        end_time: timeRange.value.endTime
      }
    })

    /**
     * 💡 期待后端返回的数据结构示例（每小时一个点）：
     * response.data = {
     *   code: 200,
     *   data: [
     *     { time: '08-11 12:00', avg: 22.4, min: 18.1, max: 26.5 },
     *     { time: '08-11 13:00', avg: 22.6, min: 18.0, max: 26.8 },
     *     ...
     *   ]
     * }
     */
    const result = response.data || []
    
    // 解析出 4 个一维数组对应 ECharts
    const timelines = result.map(item => item.time)
    const avgData = result.map(item => item.avg)
    const minData = result.map(item => item.min)
    const maxData = result.map(item => item.max)

    // 更新图表
    myChart.setOption(getBaselineOption(timelines, avgData, minData, maxData))

  } catch (error) {
    console.error('获取趋势图数据失败:', error)
    alert('网络异常，获取温度趋势失败')
  } finally {
    isLoading.value = false
  }
}

// 4. ECharts 图表配置项生成器
const getBaselineOption = (timeline, avg, min, max) => {
  return {
    backgroundColor: '#111827', // 暗色大屏底色
    title: {
      text: '全仓温度起伏走势 (℃)',
      left: 'center',
      top: 15,
      textStyle: { color: '#9ca3af', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['最高温度', '平均温度', '最低温度'],
      top: 45,
      textStyle: { color: '#9ca3af' }
    },
    grid: {
      left: '4%', right: '4%', bottom: '5%', top: '22%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeline,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', rotate: 30 } // 时间长时旋转防重叠
    },
    yAxis: {
      type: 'value',
      scale: true, // 核心：让Y轴从接近的数据开始，曲线起伏更明显
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', formatter: '{value} ℃' },
      splitLine: { lineStyle: { color: '#1f2937' } }
    },
    series: [
      {
        name: '最高温度',
        type: 'line',
        data: max,
        symbol: 'none', // 抽稀后点多，隐藏小圆点，线条更丝滑
        smooth: true,   // 平滑曲线
        itemStyle: { color: '#ef4444' }, // 红色表示高温
        lineStyle: { width: 2 }
      },
      {
        name: '平均温度',
        type: 'line',
        data: avg,
        symbol: 'none',
        smooth: true,
        itemStyle: { color: '#10b981' }, // 绿色表示平均温
        lineStyle: { width: 3, type: 'dashed' }, // 虚线区分
        areaStyle: {
          // 阴影面积渐变，增加美观度
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
          ])
        }
      },
      {
        name: '最低温度',
        type: 'line',
        data: min,
        symbol: 'none',
        smooth: true,
        itemStyle: { color: '#3b82f6' }, // 蓝色表示低温
        lineStyle: { width: 2 }
      }
    ]
  }
}

// 5. 事件交互
const handleSearch = () => {
  fetchTrendData()
}

const resetTimeRange = () => {
  initDefaultTime()
  fetchTrendData()
}

// 6. 响应式视口缩放适配
const handleResize = () => {
  myChart && myChart.resize()
}

onMounted(async () => {
  initDefaultTime()
  await nextTick()
  initChart()
  fetchTrendData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
})
</script>

<style scoped>
.trend-container {
  padding: 20px;
  background: #0f172a;
  min-height: 100vh;
  color: #f3f4f6;
}
h2 { margin-bottom: 20px; font-weight: 500; color: #38bdf8; }

/* 工具栏 */
.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  background: #1e293b;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #334155;
}
.search-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #9ca3af; }
.input-date {
  border: 1px solid #475569;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: #fff;
  background: #0f172a;
  outline: none;
}
.input-date::-webkit-calendar-picker-indicator {
  filter: invert(1); /* 将原生时间选择器的图标变成白色以适应暗色系 */
}

.btn-search { background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 4px; font-weight: 500; cursor: pointer; }
.btn-search:hover { background: #0369a1; }
.btn-search:disabled { background: #64748b; cursor: not-allowed; }

.btn-reset { background: transparent; color: #9ca3af; border: 1px solid #475569; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-reset:hover { background: #334155; color: #fff; }

/* 图表画布区域 */
.chart-wrapper {
  position: relative;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #111827;
  overflow: hidden;
}
.trend-chart {
  width: 100%;
  height: 500px; /* 固定高度确保图表饱满 */
}

/* 遮罩动画 */
.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(17, 24, 39, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 5;
}
.spinner {
  width: 36px; height: 36px;
  border: 4px solid #374151;
  border-top: 4px solid #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
