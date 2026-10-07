<template>
  <div class="monitor-container">
    <!-- 1. 顶部：环境综合指标（保持原样） -->
    <el-card class="environment-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <!-- <span class="header-title">🌍 环境综合指标</span> -->
          <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
        </div>

      </template>
      <el-row :gutter="20">
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
    <el-row :gutter="20" class="detection-grid">
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
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { User } from '@element-plus/icons-vue'
import HouseSelect from '../../components/HouseSelect.vue';

const selectedHouseCode = ref('001');

let socket = null
let isExplicitlyClosed = false

const handleHouseChange = async () => {
  if (socket) {
    socket.close();
  }
  isExplicitlyClosed = true;
  // console.log('plc_code', activeGranary.value.plc_code)
  initWebSocket()
  console.log(`切换至house: ${selectedHouseCode.value}`)
  // initDevices()
  // await fetchRunningJobs(selectedHouseCode.value)
  // query running job
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
  // value: Number
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
// const detectionItems = reactive<DetectionItem[]>([
//   { key: 'ph3', name: '🧪 磷化氢 (PH₃)', unit: 'ppm', channels: populateChannels(0, 15) },
//   { key: 'o2', name: '💨 氧气 (O₂)', unit: '%', channels: populateChannels(18, 23) },
//   { key: 'co2', name: '🌫️ 二氧化碳 (CO₂)', unit: 'ppm', channels: populateChannels(350, 1200) },
//   { key: 'bugs', name: '🐛 虫数检测', unit: '🪲', channels: populateChannels(0, 8) }
// ])

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
  initWebSocket()
})

// 2. 建立 WebSocket 连接函数
const initWebSocket = async () => {


  // const granCode = activeGranary.value.code
  // if (!granCode) {
  //   console.warn('【前端提示】当前无可用的 仓房编号，取消初始化 WebSocket');
  //   return;
  // }
  // 如果在电脑本机测试，保持 localhost；如果要手机访问，请改为工控机的局域网 IP
  socket = new WebSocket(`ws-api/ws/gas/${selectedHouseCode.value}`);
  // socket = new WebSocket('ws:192.168.0.100:8000/ws/live');

  // 连接成功事件
  socket.onopen = () => {

    console.log('成功连接到 Python 后端 gas WebSocket！,gran code', selectedHouseCode.value);
    isExplicitlyClosed = false; // 每次全新建立连接时，重置手动关闭状态
  };

  // 接收到后端实时数据事件
  socket.onmessage = (event) => {
    // 解析后端传过来的 JSON 字符串
    const res = JSON.parse(event.data);
    // 直接赋值，Vue 3 会自动、高效地刷新界面上对应的数字
    // console.log('取得后端数据', res)
    channelData.value = res;
    console.log(channelData.value)
    detectionItems.forEach(item => {
      item.channels = populateChannels(channelData.value.splice(0, 16))
    })
    envData.humidity = channelData.value[1].toFixed(1)
    envData.temperature = channelData.value[0].toFixed(1)
    envData.distance = channelData.value[2]
    envData.peopleCount = channelData.value[3]
    envData.dust = channelData.value[4]
  };

  // 连接关闭事件
  socket.onclose = () => {

    console.log('【前端提示】home连接已断开');
    // no reconnect if manually closed
    if (!isExplicitlyClosed) {
      console.log('3秒后尝试自动重连...');
      setTimeout(initWebSocket, 3000); // 掉线自动重连机制
    }
    // liveData.value = ['--', '--', '--', '--', '--', '--'];
  };

  // 发生错误事件
  socket.onerror = (error) => {
    console.error('【前端提示】WebSocket 发生错误:', error);
  };
};

onBeforeUnmount(() => {
  if (socket) {
    socket.close();
    // 切换tab时，没必要保持连接，当成手动关闭
    console.log('manually closed websocket')
    isExplicitlyClosed = true
  }

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
