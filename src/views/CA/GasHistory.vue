<template>
  <div class="monitor-container">
    <!-- 1. 顶部：环境综合指标（保持原样） -->
    <el-card class="environment-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <!-- <span class="header-title">🌍 环境综合指标</span> -->
          <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
          <el-date-picker v-model="controls.start_time" type="datetime" placeholder="请选择时间" style="width: 200px" />
          <!-- 搜索按钮：绑定点击事件，并在搜索进行中或任务激活时禁用 -->
          <el-button type="primary" :loading="isLoading" :disabled="!controls.start_time" @click="handleSearch">
            查询
          </el-button>

          <!-- 可选：重置按钮（日常开发中通常成对出现，体验更好） -->
          <el-button :disabled="isLoading" @click="handleReset">
            重置
          </el-button>

        </div>

      </template>
      <el-row :gutter="20" v-if="envData.temperature">
        <el-col :span="4" :xs="12">
          <el-statistic title="温度" :value="envData.temperature" suffix="°C" />
        </el-col>
        <el-col :span="4" :xs="12">
          <el-statistic title="湿度" :value="envData.humidity" suffix="%" />
        </el-col>
        <el-col :span="4" :xs="12">
          <el-statistic title="粉尘浓度" :value="envData.dust" suffix="ug/m³" />
        </el-col>
        <el-col :span="4" :xs="12">
          <el-statistic title="仓内人数" :value="envData.peopleCount" suffix="人">
            <template #prefix>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="4" :xs="12">
          <el-statistic title="安全距离" :value="envData.distance" suffix="mm" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 2. 主体：四大核心检测项区域 -->
    <el-row :gutter="20" class="detection-grid" v-if="envData.temperature">
      <!-- ⭐ 关键修改：将 :span 改为 24，让每个区域不论在 PC 还是手机都独占一行 -->
      <el-col :span="24" :xs="24" v-for="item in detectionItems" :key="item.key" class="detection-col">
        <el-card shadow="hover" class="item-card">
          <template #header>
            <div class="item-header">
              <span class="item-title">{{ item.name }}</span>
              <!-- <el-tag size="small" type="info">共 16 通道</el-tag> -->
            </div>
          </template>

          <!-- 16 通道网格布局 -->
          <!-- ⭐ 优化：PC端用 :span="3"（24/3 = 8个，刚好两行展示完）；手机端用 :xs="6"（24/6 = 4个，分四行） -->
          <el-row :gutter="10">
            <el-col :span="3" :xs="6" v-for="channel in item.channels" :key="channel.id" class="channel-col">
              <div class="channel-box" :class="getAlarmClass(channel.value, item.key)">
                <div class="channel-name">CH-{{ String(channel.id).padStart(2, '0') }}</div>
                <div class="channel-value">
                  {{ channel.value }} <span class="unit">{{ item.unit }}</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { User } from '@element-plus/icons-vue'
import HouseSelect from '../../components/HouseSelect.vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const selectedHouseCode = ref('001');

let socket = null
let isExplicitlyClosed = false

const controls = reactive({
  house_code: '',
  start_time: ''
})

const isLoading = ref(false)
const handleSearch = async () => {
  if (!controls.start_time) {
    alert('请先选择要查询的日期和具体时间！')
    return
  }
  isLoading.value = true
  // 💡 避坑处理：datetime-local 默认格式是 "2026-08-11T14:30" 
  // 此处通过正则和拼接，将其自动格式化为后端数据库标准的 "2026-08-11 14:30:00"
  const rawTime = controls.start_time
  const isoStartTime = new Date(controls.start_time).toISOString().split('.')[0] + 'Z'
  console.log(rawTime)
  const formattedTime = rawTime
  console.log('发起历史时间点查询：', isoStartTime)

  try {
    // console.log('formattedTime', formattedTime)
    const response = await axios.get('http-api/api/gas/querygas', {
      params: {
        input_time: isoStartTime,
        house_code: selectedHouseCode.value
      }
    });
    if (!response.data || Object.keys(response.data).length == 0) {
      ElMessage.error('未找到该时间点的数据')
      envData.temperature = null
      return
    }
    ElMessage.success('数据查询成功')
    // console.log('ui response', response.data)
    channelData.value = response.data
    detectionItems.forEach(item => {
      item.channels = populateChannels(channelData.value.splice(0, 16))
    })
    envData.humidity = channelData.value[1].toFixed(1)
    envData.temperature = channelData.value[0].toFixed(1)
    envData.distance = channelData.value[2]
    envData.peopleCount = channelData.value[3]
    envData.dust = channelData.value[4]
  } catch (err) {
    console.error('获取数据异常:', err)
  } finally {
    isLoading.value = false
  }
}

const handleReset = () => {
  controls.start_time = ''
}


const handleHouseChange = async () => {
  console.log(`切换至house: ${selectedHouseCode.value}`)
}

interface Channel {
  id: number
  value: number
}

interface DetectionItem {
  key: string
  name: string
  unit: string
  channels: Channel[]
}

const channelData = ref([])

const populateChannels = (nums): Channel[] => {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    value: nums[i]
  }))
}

const envData = reactive({
  temperature: null,
  humidity: null,
  dust: null,
  peopleCount: null,
  distance: null
})

const detectionItems = reactive<DetectionItem[]>([
  { key: 'ph3', name: '🧪 磷化氢 (PH₃)', unit: 'ppm', channels: [] },
  { key: 'o2', name: '💨 氧气 (O₂)', unit: '%', channels: [] },
  { key: 'co2', name: '🌫️ 二氧化碳 (CO₂)', unit: 'ppm', channels: [] },
  { key: 'bugs', name: '🐛 虫数检测', unit: '个', channels: [] }
])
const getAlarmClass = (value: number, type: string): string => {
  switch (type) {
    case 'ph3':
      if (value > 10) return 'status-danger'
      if (value > 3) return 'status-warning'
      return 'status-success'
    case 'o2':
      if (value < 19.5 || value > 23.5) return 'status-danger'
      if (value < 20.5) return 'status-warning'
      return 'status-success'
    case 'co2':
      if (value > 1000) return 'status-danger'
      if (value > 700) return 'status-warning'
      return 'status-success'
    case 'bugs':
      if (value > 5) return 'status-danger'
      if (value > 2) return 'status-warning'
      return 'status-success'
    default:
      return 'status-success'
  }
}

onMounted(async () => {

})
</script>

<style scoped>
.monitor-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.environment-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
}

.detection-grid {
  margin-bottom: -20px;
}

.detection-col {
  margin-bottom: 20px;
}

.item-card {
  border-radius: 8px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.channel-col {
  margin-bottom: 10px;
}

.channel-box {
  padding: 12px 5px;
  /* 稍微增加了上下内边距，大屏下看起来更饱满 */
  text-align: center;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  /* transition: all 0.3s; */
}

.channel-box:hover {
  /* transform: translateY(-2px); */
  /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); */
}

.channel-name {
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
}

.channel-value {
  font-size: 14px;
  font-weight: bold;
}

.unit {
  font-size: 10px;
  font-weight: normal;
  color: #606266;
}

.status-success {
  background-color: #f0f9eb;
  border-color: #c2e7b0;
  color: #67c23a;
}

.status-warning {
  background-color: #fdf6ec;
  border-color: #f5dab1;
  color: #e6a23c;
}

.status-danger {
  background-color: #fef0f0;
  border-color: #fde2e2;
  color: #f56c6c;
  /* animation: pulse 2s infinite; */
}

/* @keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }

  100% {
    opacity: 1;
  }
} */
</style>
