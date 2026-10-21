<template>
  <el-card class="solar-chart-card">
    <!-- 顶部控制栏 -->
    <template #header>
      <div class="card-header">
        <span class="title">⚡ 光伏发电量监控</span>
        <div class="controls">
          <!-- 1. 维度切换按钮组 -->
          <div class="nvr-selector-box">
            <span>请选择电站：</span>
            <el-select v-model="activePlant" @change="handlePlantChange" style="width: 120px; margin-right: 10px;">
              <el-option v-for="plant in stationList" :key="plant.code" :label="plant.name" :value="plant.code" />
            </el-select>
          </div>
          <el-radio-group v-model="dimension" @change="handleDimensionChange" size="default">
            <el-radio-button label="Hour">小时</el-radio-button>
            <el-radio-button label="Day">日</el-radio-button>
            <el-radio-button label="Month">月</el-radio-button>
            <el-radio-button label="Year">年</el-radio-button>
          </el-radio-group>

          <!-- 2. 动态日期选择器（根据维度自动改变类型） -->
          <el-date-picker type="date" v-model="selectedDate" "
              style=" width: 160px; margin-left: 15px;" />
        </div>
      </div>
    </template>

    <!-- 3. ECharts 图表容器 -->
    <div ref="chartRef" class="chart-container"></div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import http from '../../../api/http'

// --- 响应式变量 ---
const dimension = ref('day') // 当前维度：hour, day, month, year
const dimensionMap = {
  Hour: '小时',
  Day: '日',
  Month: '月',
  Year: '年'
}
const selectedDate = ref(new Date()) // 选择的时间
const chartRef = ref(null) // 图表 DOM 引用
let myChart = null // ECharts 实例

const stationList = ref([])
const activePlant = ref('')
// --- 计算属性：根据维度动态改变 ElementPlus 选择器属性 ---
// const datePickerType = computed(() => {
//   if (dimension.value === 'hour') return 'date'
//   if (dimension.value === 'day') return 'month'
//   if (dimension.value === 'month') return 'year'
//   return 'year'
// })

// const pickerPlaceholder = computed(() => {
//   if (dimension.value === 'hour') return '选择日期'
//   if (dimension.value === 'day') return '选择月份'
//   if (dimension.value === 'month') return '选择年份'
//   return '选择年份'
// })

const handlePlantChange = async () => {
  try {
    const res = await http.get('/api/stations');
    console.log('power stations:', res)
    stationList.value = res.data;
  } catch (err) {
    console.error(err);
  } finally {
    // loading.value = false;
  }
}
// --- 模拟切换维度时生成契合 FusionSolar 的 X 轴和数据 ---
const generateXAxiskData = (pvData) => {
  let xAxisData = []
  let seriesData = []
  const dim = dimension.value

  // if (dim === 'Hour') {
  //   // 24小时，白天有发电量，夜晚为0
  //   for (let i = 0; i < dataLen; i++) {
  //     xAxisData.push(`${i}:00`)
  //     seriesData.push((i > 5 && i < 19) ? Math.floor(Math.random() * 50 + 20) : 0)
  //   }
  // } else if (dim === 'Day') {
  //   // 按日：显示某月30天
  //   for (let i = 1; i <= dataLen; i++) {
  //     xAxisData.push(`${i}日`)
  //     seriesData.push(Math.floor(Math.random() * 300 + 150))
  //   }
  // } else if (dim === 'Month') {
  //   // 按月：显示1-12月
  //   for (let i = 1; i <= dataLen; i++) {
  //     xAxisData.push(`${i}月`)
  //     seriesData.push(Math.floor(Math.random() * 5000 + 3000))
  //   }
  // } else if (dim === 'Year') {
  //   // 按年：显示近年生命周期
  //   const currentYear = new Date().getFullYear()
  //   for (let i = currentYear - 5; i <= currentYear; i++) {
  //     xAxisData.push(`${i}年`)
  //     seriesData.push(Math.floor(Math.random() * 50000 + 40000))
  //   }
  // }

  for (let i = 0; i < pvData.length; i++) {
    xAxisData.push(pvData[i]['time'])
    seriesData.push(pvData[i]['power'])
  }
  return { xAxisData, seriesData }
}

// --- 初始化与渲染 ECharts ---
const initChart = (xAxisData, seriesData) => {
  if (!myChart && chartRef.value) {
    myChart = echarts.init(chartRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>💡 发电量: <b>{c}</b> kWh',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '4%', right: '3%', bottom: '8%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#909399' } },
      axisLabel: {
        interval: 0, // 强制显示所有标签（0 代表隔 0 个显示，即全部显示）

        // 可选扩展：如果强制显示后文字太挤，可以开启以下配置
        rotate: 30,  // 文字倾斜 30 度显示，防止挤压
      }
    },
    yAxis: {
      type: 'value',
      name: '发电量 (kWh)',
      nameTextStyle: { color: '#606266', padding: [0, 0, 0, 40] },
      splitLine: { lineStyle: { type: 'dashed', color: '#E4E7ED' } },
      axisLine: { show: false }
    },
    series: [
      {
        name: '发电量',
        type: 'bar',
        data: seriesData,
        barMaxWidth: '35%',
        // 匹配华为 FusionSolar 的标志性科技绿渐变色
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10B981' }, // 亮绿
            { offset: 1, color: '#059669' }  // 深绿
          ]),
          borderRadius: [4, 4, 0, 0] // 柱状图顶部圆角
        },
        // 鼠标悬浮高亮样式
        emphasis: {
          itemStyle: { color: '#34D399' }
        }
      }
    ]
  }

  myChart.setOption(option)
}

// --- 核心业务逻辑：获取数据并更新 ---
const fetchChartData = async () => {
  // 在实际开发中，这里需要将 selectedDate 转为时间戳并调用你的 Python/Go 北向 API
  // console.log("当前请求维度:", dimension.value, "选择的时间戳:", selectedDate.value.getTime())


  // isLoading.value = true
  try {
    // 💡 替换为您后端的趋势接口地址
    const response = await http.get('/api/solar', {
      params: {
        plant_code: activePlant.value,
        dimension: dimension.value,
        input_time: selectedDate.value
      }
    })

    console.log('response: ', response.data)
    const { xAxisData, seriesData } = generateXAxiskData(response.data)
    initChart(xAxisData, seriesData)

  } catch (error) {
    console.error('获取趋势图数据失败:', error)
    alert('网络异常，获取能耗趋势失败')
  } finally {
    // isLoading.value = false
  }


}

// 维度改变的回调
const handleDimensionChange = () => {
  // selectedDate.value = new Date() // 切换维度重置为当前时间
  fetchChartData()
}

// 监听窗口缩放，防止图表变形
const handleResize = () => {
  myChart && myChart.resize()
}

const fetchStationList = async () => {
  // if (!isAdmin.value) return; // 访客不请求列表，由前端隔离或展示空白
  // loading.value = true;
  try {
    const res = await http.get('/api/stations');
    console.log('res:', res)
    stationList.value = res.data;
    activePlant.value = stationList.value[0].code
  } catch (err) {
    console.error(err);
  } finally {
    // loading.value = false;
  }
};

// --- 生命周期钩子 ---
onMounted(() => {
  // fetchChartData()
  fetchStationList();
  // window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  myChart && myChart.dispose()
})
</script>

<style scoped>
.solar-chart-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.controls {
  display: flex;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 400px;
  /* 固定图表高度 */
}
</style>
