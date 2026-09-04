<template>
  <div class="trend-container">
    <h2>整仓温湿度趋势分析（每10分钟抽样）</h2>

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
    <!-- 🎯 2. 新增：层级切换选项卡（极致简洁扁平设计） -->
    <div class="layer-selector">

      <!-- 💡 新增：数据指标复选框群组 -->
      <div class="metric-checkboxes">
        <span class="selector-label">温湿度：</span>
        <label v-for="metric in metricOptions" :key="metric.value" class="checkbox-label">
          <input type="checkbox" :value="metric.value" v-model="selectedMetrics" :disabled="isLoading"   @change="handleMetricChange"/>
          <span class="checkbox-text">{{ metric.label }}</span>
        </label>
      </div>
      <span class="selector-label">监测层级：</span>
      <div class="layer-buttons">
        <button v-for="item in layerOptions" :key="item.value" class="btn-layer"
          :class="{ 'active': currentLayer === item.value }" :disabled="isLoading"
          @click="handleLayerChange(item.value)">
          {{ item.label }}
        </button>
      </div>

    </div>

    <!-- 2. 图表渲染区域 -->
    <div class="chart-wrapper">
      <!-- Loading 遮罩 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在计算该层级测温点数据，请稍候...</p>
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

const metricOptions = [
  { label: '平均', value: 'avg' },
  { label: '最高', value: 'max' },
  { label: '最低', value: 'min' }

]

// 💡 新增：已选中的指标（默认全部选中）
const selectedMetrics = ref([])

const layerOptions = [
  { label: '整仓', value: -1 },
  { label: '上层', value: 0 },
  { label: '中上层', value: 1 },
  { label: '中下层', value: 2 },
  { label: '下层', value: 3 }
];

const SERIES_TEMPLATES = [
  {
    name: '最高温度',
    type: 'line',
    data: [],
    symbol: 'none', // 抽稀后点多，隐藏小圆点，线条更丝滑
    smooth: true,   // 平滑曲线
    itemStyle: { color: '#EF4444' }, // 红色表示高温
    lineStyle: { width: 4, type: 'solid' },// 🌟 solid 表示实线
    yAxisIndex: 0
  },
  {
    name: '平均温度',
    type: 'line',
    data: [],
    symbol: 'none',
    smooth: true,
    yAxisIndex: 0,
    itemStyle: { color: '#F97316' }, // 绿色表示平均温
    lineStyle: { width: 4, type: 'solid' }, // 虚线区分
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
    data: [],
    symbol: 'none',
    yAxisIndex: 0,
    smooth: true,
    itemStyle: { color: '#F59E0B' }, // 蓝色表示低温
    lineStyle: { width: 4, type: 'solid' }
  },

  {
    name: '最大湿度',
    type: 'line',
    data: [],
    symbol: 'none', // 抽稀后点多，隐藏小圆点，线条更丝滑
    smooth: true,   // 平滑曲线
    itemStyle: { color: '#1D4ED8' }, // 红色表示高温
    lineStyle: { width: 1.5, type: 'dashed', dashArray: [4, 6] },
    yAxisIndex: 1
  },
  {
    name: '平均湿度',
    type: 'line',
    data: [],
    symbol: 'none',
    smooth: true,
    itemStyle: { color: '#0D9488' }, // 绿色表示平均温
    lineStyle: { width: 1.5, type: 'dashed', dashArray: [4, 6] }, // 虚线区分
    areaStyle: {
      // 阴影面积渐变，增加美观度
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
      ])
    },
    yAxisIndex: 1
  },
  {
    name: '最小湿度',
    type: 'line',
    data: [],
    symbol: 'none',
    step: 'middle',
    yAxisIndex: 1,
    itemStyle: { color: '#38BDF8' }, // 蓝色表示低温
    lineStyle: { width: 1.5, type: 'dashed', dashArray: [4, 6] }
  }

]
const legendHeadings = ['最高温度', '平均温度', '最低温度', '最大湿度', '平均湿度', '最小湿度']

const currentLayer = ref(-1); // 🎯 当前选中的层级，默认值为 'all' (全仓)


const handleMetricChange = () => {
  // 如果用户把三个勾都取消了，可以加一个空值保护（可选）
  if (selectedMetrics.value.length === 0) {
    console.warn('请至少选择一个数据指标')
  }
  fetchTrendData() // 立即触发后端 API
}

const initDefaultTime = () => {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  // 转换为 datetime-local 输入框需要的格式: YYYY-MM-DDTHH:mm
  timeRange.value.startTime = formatDateToLocal(threeDaysAgo)
  timeRange.value.endTime = formatDateToLocal(now)
}



// 🎯 核心：切换层级时触发的函数
const handleLayerChange = async (layerValue) => {
  if (currentLayer.value === layerValue)
    return; // 避免重复点击相同选项
  currentLayer.value = layerValue;               // 切换当前选中状态
  await fetchTrendData();                        // 立即触发后端 API
};


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
    myChart.setOption(getBaselineOption([], [], []))
  }
}

const http = axios.create({
  // baseURL: 'http://192.168.0.16:8000',
  baseURL: 'http-api',
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
    // console.log('selected options: ', selectedMetrics.value)
    if (selectedMetrics.value.length == 0) {
      selectedMetrics.value.push(metricOptions[0].value)
    }
    console.log('selected options: ', selectedMetrics.value)
    // 💡 替换为您后端的趋势接口地址
    const url = '/api/temp-trend'
    const response = await http.get(url, {
      params: {
        start_time: timeRange.value.startTime,
        end_time: timeRange.value.endTime,
        layer: currentLayer.value,
        options: selectedMetrics.value
      },
      paramsSerializer: {
        indexes: null // 这样可以去掉默认生成的方括号 []
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
    let result = response.data || []
    if (!result) {
      return
    }

    // 解析出 4 个一维数组对应 ECharts
    const timelines = result.map(item => item.time)
    // const avgTemp = result.map(item => item.avg_temp ?? null)
    // const minTemp = result.map(item => item.min_temp ?? null)
    // const maxTemp = result.map(item => item.max_temp ?? null)

    // const avgHumid = result.map(item => item.avg_humid ?? null)
    // const minHumid = result.map(item => item.min_humid ?? null)
    // const maxHumid = result.map(item => item.max_humid ?? null)
    // const metricData = [maxTemp, avgTemp, minTemp, maxHumid, avgHumid, minHumid]
    // // avg_temp 	min_temp ? max_temp ? avg_humid.min_humid.max_humid
    // // 更新图表
    let displaySeries = []
    let displayLegend = []
    // // if(avg)
    // // myChart.setOption(getBaselineOption(timelines, avgTemp, minData, maxData))
    // metricData.forEach((val, i) => {
    //   if (val && val[0]) {
    //     SERIES_TEMPLATES[i].data = val
    //     displaySeries.push(SERIES_TEMPLATES[i])
    //     displayLegend.push(legendHeadings[i])
    //   }
    // })

    const metricStrs = ['max_temp', 'avg_temp', 'min_temp', 'max_humid', 'avg_humid', 'min_humid']
    metricStrs.forEach((col, i) => {
      if (result[0][col]) {
        // console.log('col ', col, 'i ', i)
        let data = result.map(item => item[col])
        SERIES_TEMPLATES[i].data = data
        displaySeries.push(SERIES_TEMPLATES[i])
        displayLegend.push(legendHeadings[i])
      }
    })


    console.log('displaySeries', displaySeries, ' legend ', displayLegend)
    // # ⚠️ 记得加 notMerge: true 确保数量减少时旧线能被销毁
    myChart.setOption(
      getBaselineOption(timelines, displayLegend, displaySeries),
      {
        notMerge: true,
        lazyUpdate: false
      }
    )
  } catch (error) {
    console.error('获取趋势图数据失败:', error)
    alert('网络异常，获取温度趋势失败')
  } finally {
    isLoading.value = false
  }
}

// 4. ECharts 图表配置项生成器
const getBaselineOption = (timeline, legendData, seriesData) => {

  return {
    backgroundColor: '#111827', // 暗色大屏底色
    title: {
      text: '温湿度起伏走势 (℃)',
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
      data: legendData,
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
    yAxis: [{
      type: 'value',
      name: '温度℃',
      scale: true, // 核心：让Y轴从接近的数据开始，曲线起伏更明显
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', formatter: '{value} ℃' },
      splitLine: { lineStyle: { color: '#1f2937' } }
    },
    {
      type: 'value',
      name: '湿度(%RH)',
      scale: true, // 核心：让Y轴从接近的数据开始，曲线起伏更明显
      axisLine: { lineStyle: { color: '#884151' } },
      axisLabel: { color: '#9ci3xf', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#8f1981' } }
    }
    ],
    series: seriesData
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

h2 {
  margin-bottom: 20px;
  font-weight: 500;
  color: #38bdf8;
}

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

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #9ca3af;
}

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
  filter: invert(1);
  /* 将原生时间选择器的图标变成白色以适应暗色系 */
}

.btn-search {
  background: #0284c7;
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.btn-search:hover {
  background: #0369a1;
}

.btn-search:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.btn-reset {
  background: transparent;
  color: #9ca3af;
  border: 1px solid #475569;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-reset:hover {
  background: #334155;
  color: #fff;
}

/* 🎯 新增：层级选择器专属扁平样式 */
.layer-selector {
  display: flex;
  align-items: center;
  justify-content: right;
  margin-bottom: 20px;
  padding: 10px 14px;
  background-color: #f8fafc;
  /* 极浅灰底色作为视觉分区 */
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.selector-label {
  font-size: 13px;
  font-weight: bold;
  color: #475569;
  /* padding-right: 0px; */
  /* margin-right: 12px; */
}

.layer-buttons {
  display: flex;
  /* align-items: flex-end; */

  gap: 6px;
}

/* 极致简洁无动画的扁平按钮 */
.btn-layer {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  color: #64748b;
  padding: 4px 12px;
  font-size: 13px;
}

/* 🎯 激活（选中）状态：变为高亮深色，边框变蓝 */
.btn-layer.active {
  background-color: #1e293b;
  border-color: #1e293b;
  color: #ffffff;
  font-weight: bold;
}

.btn-layer:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


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
  height: 500px;
  /* 固定高度确保图表饱满 */
}

/* 遮罩动画 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 24, 39, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #374151;
  border-top: 4px solid #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 💡 新增：复选框群组样式 */
.metric-checkboxes {
  display: flex;
  align-items: center;
  gap: 10px;
  border-right: 1px solid #dcdfe6;
  /* 与左边层级加一条淡淡的分割线 */
  padding-right: 16px;
  margin-right: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #606266;
  transition: color 0.2s;
}

.checkbox-label:hover {
  color: #409eff;
  /* 悬浮时文字变蓝 */
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  margin-right: 6px;
  width: 15px;
  height: 15px;
  accent-color: #409eff;
  /* 现代化浏览器的主题色绑定 */
}

.checkbox-label input:disabled+.checkbox-text {
  color: #c0c4cc;
  cursor: not-allowed;
}
</style>
