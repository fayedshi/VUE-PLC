<script setup>
import { reactive, onMounted, ref, watch, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

// 1. 响应式控制变量
const activeTab = ref('hour') // 默认查按小时
const isLoading = ref(false)
const chartRef = ref(null)    // 用于绑定 DOM 节点的 ref
let myChart = null            // 存放 ECharts 实例

// 2. 初始化或更新 ECharts 图表的函数
const initOrUpdateChart = (chartData) => {
  if (!myChart && chartRef.value) {
    // 首次初始化
    myChart = echarts.init(chartRef.value)
  }
  
  if (!myChart) return

  // 绝美工业级图表配置
  const option = {
    title: {
      text: chartData.title,
      textStyle: { fontSize: 14, color: '#303133' },
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: chartData.xAxis,
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'value',
      name: chartData.series_name,
      axisLabel: { color: '#606266' },
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    series: [
      {
        name: chartData.series_name,
        // 🔑 智能化展现：小时和日用平滑折线图，月份用柱状图
        type: activeTab.value === 'month' ? 'bar' : 'line',
        smooth: true,
        data: chartData.yAxis,
        barWidth: '40%',
        itemStyle: {
          color: activeTab.value === 'month' ? '#409EFF' : '#67C23A' // 月份蓝色，天/小时绿色（绿色代表环保光伏）
        },
        areaStyle: activeTab.value !== 'month' ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.4)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.0)' }
          ])
        } : None
      }
    ]
  }

  myChart.setOption(option, true) // true 表示完全覆盖刷新
}

// 3. 核心抓取函数
const fetchChartData = async () => {
  isLoading.value = true
  try {
    const res = await axios.get('/api/v1/solar/history', {
      params: { time_type: activeTab.value }
    })
    
    if (res.data.status === 'SUCCESS') {
      // 必须在 nextTick 中执行，确保 DOM 容器已经渲染完毕
      await nextTick()
      initOrUpdateChart(res.data)
    }
  } catch (error) {
    ElMessage.error(`抓取光伏历史趋势失败: ${error.response?.data?.detail || error.message}`)
  } finally {
    isLoading.value = false
  }
}

// 4. 监听切换标签：当用户点击日、月、时，自动重查数据
watch(activeTab, () => {
  fetchChartData()
})

// 5. 生命周期善后
onMounted(() => {
  fetchChartData()
  // 监听浏览器窗口缩放，防止图表变形
  window.addEventListener('resize', () => myChart?.resize())
})
</script>

<template>
  <div class="solar-chart-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title">☀️ 华为智能光伏 - 发电数据分析</span>
          
          <!-- 🎯 极简条件切换器 -->
          <el-radio-group v-model="activeTab" size="small" :disabled="isLoading">
            <el-radio-button label="hour">实时(时)</el-radio-button>
            <el-radio-button label="day">历史(日)</el-radio-button>
            <el-radio-button label="month">历史(月)</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 📊 ECharts 容器挂载点 -->
      <div 
        v-loading="isLoading" 
        element-loading-text="正在同步华为光伏数据..."
        ref="chartRef" 
        class="main-chart"
      ></div>
    </el-card>
  </div>
</template>

<style scoped>
.solar-chart-container { padding: 20px; background-color: #f5f7fa; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 15px; font-weight: bold; color: #303133; }
.box-card { border-radius: 8px; }
/* 🔑 必须给图表容器指定高度，否则 ECharts 渲染不出来 */
.main-chart { width: 100%; height: 350px; }
</style>
