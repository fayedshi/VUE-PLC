<template>
  <div class="app-container">

    <!-- 顶栏：网络状态与仓房选择（并排紧凑设计） -->
    <div class="top-bar">
      <!-- 仓房选择下拉列表 -->
      <div class="select-box">
        <label for="granary-select">当前仓房：</label>
        <select id="granary-select" v-model="currentGranaryCode" @change="handleGranaryChange()">
          <option v-for="item in granaryList" :key="item.code" :value="item.code">
            {{ item.name }} ({{ item.code }})
          </option>
        </select>
      </div>

      <!-- 状态显示栏 -->
      <div class="connection-status" :class="{ 'connected': isConnected }">
        {{ isConnected ? '已连接 (ONLINE)' : '断开中 (OFFLINE)' }}
      </div>
    </div>

    <!-- 核心内容区域 -->
    <div class="content-box">
      <!-- 1. 仓房基础静态信息（对应你提供的数据库字段） -->
      <div class="granary-info-header">
        <h2>{{ activeGranary.name || '未选择仓房' }}</h2>
        <div class="info-grid">
          <div class="info-item"><span>廒间编号：</span>{{ activeGranary.code || '--' }}</div>
          <div class="info-item"><span>储粮品种：</span>{{ activeGranary.grain_type || '--' }}</div>
          <div class="info-item"><span>设计仓容：</span>{{ activeGranary.capacity ? activeGranary.capacity + ' 吨' : '--' }}
          </div>
          <div class="info-item"><span>保管人员：</span>{{ activeGranary.keeper || '--' }}</div>
          <div class="info-item"><span>报警上限：</span><span class="alert-text">{{ activeGranary.max_temp ?
            activeGranary.max_temp + ' ℃' : '--' }}</span></div>
          <div class="info-item"><span>PLC编号：</span>{{ activeGranary.plc_code || '--' }}</div>
        </div>
      </div>

      <!-- 2. 数据看板容器 -->
      <div class="dashboard-simple">
        <!-- 上部分：环境数据 -->
        <div class="board-row">
          <div class="card-simple">
            <span class="label">实时平均温度</span>
            <span class="value">{{ liveData[4] }} <span class="unit">℃</span></span>
          </div>
          <div class="card-simple">
            <span class="label">实时平均湿度</span>
            <span class="value">{{ liveData[5] }} <span class="unit">%</span></span>
          </div>
        </div>

        <!-- 下部分：电流数据（上下完全隔开） -->
        <div class="board-row">
          <div class="card-simple">
            <span class="label">实时电流A</span>
            <span class="value">{{ liveData[0] }} <span class="unit">A</span></span>
          </div>
          <div class="card-simple">
            <span class="label">实时电流B</span>
            <span class="value">{{ liveData[1] }} <span class="unit">A</span></span>
          </div>
          <div class="card-simple">
            <span class="label">实时电流C</span>
            <span class="value">{{ liveData[2] }} <span class="unit">A</span></span>
          </div>
          <div class="card-simple">
            <span class="label">实时功率</span>
            <span class="value">{{ liveData[3] }} <span class="unit">KW</span></span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios'
// 1. 定义响应式变量
const isConnected = ref(false);
const liveData = ref(['--', '--', '--', '--', '--', '--']);
// const status = ref('Running')
const currentGranaryCode = ref(''); // 当前选中的仓房编号
const granaryList = ref([]);        // 下拉列表所有仓房数据
const activeGranary = ref({});      // 当前选中仓房的详细静态字段

// const plcData = ref({ temperature: 0.0, pressure: 0.0, status: 'UNKNOWN' });
let socket = null;
let isExplicitlyClosed = false

// --- 模拟后端 API 请求 ---
// 1. 获取所有仓房列表（用于渲染下拉菜单）
const fetchGranaryList = async () => {
  // loading.value = true
  console.log('in fetchGranaryList')
  try {
    // 💡 动态将前端的输入框内容拼接到 URL 的参数中 (Query Parameters)
    const response = await axios.get("http-api/api/granary", {
      params: {
        name: '',
        grain_type: '',
        keeper: ''
      }
    })
    // 将后端返回的 MySQL 字典列表直接赋给组件变量
    // granaryList.value = response.data
    return response.data
  } catch (error) {
    console.error('❌ 请求后端接口失败:', error)
    alert('数据加载失败，请检查后端服务是否启动！')
  } finally {
    // loading.value = false
  }
}

const handleGranaryChange = async () => {
  // 1. 从列表中找到当前选中的仓房对象，同步更新静态信息
  const selected = granaryList.value.find(item => item.code === currentGranaryCode.value);
  if (selected) {
    activeGranary.value = selected;
  }
  // 2. 去后台重新请求该仓房的最新传感器实时数值
  // await loadLiveData(currentGranaryCode.value);
  if (socket) {
    socket.close();
  }
  isExplicitlyClosed = true;
  // console.log('plc_code', activeGranary.value.plc_code)
  initWebSocket()
};

// 2. 建立 WebSocket 连接函数
const initWebSocket = async () => {


  const plcCode = activeGranary.value.plc_code
  if (!plcCode) {
    console.warn('【前端提示】当前无可用的 plc_code，取消初始化 WebSocket');
    return;
  }
  // 如果在电脑本机测试，保持 localhost；如果要手机访问，请改为工控机的局域网 IP
  socket = new WebSocket(`ws-api-${plcCode}/ws/live`);
  // socket = new WebSocket('ws:192.168.0.100:8000/ws/live');

  // 连接成功事件
  socket.onopen = () => {
    isConnected.value = true;
    console.log('成功连接到 Python 后端 WebSocket！,plc_code', activeGranary.value.plc_code);
    isExplicitlyClosed = false; // 每次全新建立连接时，重置手动关闭状态
  };

  // 接收到后端实时数据事件
  socket.onmessage = (event) => {
    // 解析后端传过来的 JSON 字符串
    const res = JSON.parse(event.data);
    // 直接赋值，Vue 3 会自动、高效地刷新界面上对应的数字
    // console.log('取得后端数据', res)
    liveData.value = res;
  };

  // 连接关闭事件
  socket.onclose = () => {
    isConnected.value = false;
    console.log('【前端提示】连接已断开');
    // no reconnect if manually closed
    if (!isExplicitlyClosed) {
      console.log('3秒后尝试自动重连...');
      setTimeout(initWebSocket, 3000); // 掉线自动重连机制
    }
  };

  // 发生错误事件
  socket.onerror = (error) => {
    console.error('【前端提示】WebSocket 发生错误:', error);
  };
};

// 3. 生命周期：组件加载时启动连接
onMounted(async () => {
  try {
    // 步骤1：先拉取所有的仓房列表
    const list = await fetchGranaryList();
    console.log('list ',list)
    granaryList.value = list;
    if (list.length > 0) {
      // 步骤2：默认选中第一个仓房
      currentGranaryCode.value = list[0].code;
      activeGranary.value = list[0];
    }
  } catch (error) {
    console.error("初始化看板失败:", error);
  }
  initWebSocket();
  console.log('after init websocket')
});

// 4. 生命周期：组件销毁时关闭连接，释放工控机内存
onBeforeUnmount(() => {
  if (socket) {
    socket.close();
    // 切换tab时，没必要保持连接，当成手动关闭
    console.log('manually closed websocket')
    isExplicitlyClosed=true
  }
  
});
</script>

<style scoped>
/* 容器基准 */
.app-container {
  max-width: 800px;
  margin: 30px auto;
  font-family: sans-serif;
}

/* 顶栏控制区布局 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

/* 简洁原生态下拉框样式 */
.select-box label {
  font-size: 14px;
  color: #475569;
  font-weight: bold;
}

.select-box select {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #cbd5e1;
  background-color: #fff;
  color: #1e293b;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}

/* 状态标签 */
.connection-status {
  padding: 4px 12px;
  background-color: #ef4444;
  color: white;
  border-radius: 4px;
  font-weight: bold;
  font-size: 12px;
}

.connection-status.connected {
  background-color: #22c55e;
}

/* 主看板白底边框 */
.content-box {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #ffffff;
  padding: 20px;
}

/* 仓房字段网格平铺布局 */
.granary-info-header {
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
}

.granary-info-header h2 {
  margin: 0 0 14px 0;
  color: #1e293b;
  font-size: 18px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 150px);
  /* 3列扁平布局 */
  gap: 10px 30px;
  font-size: 13px;
  color: #334155;
}

.info-item span {
  color: #64748b;
}

.alert-text {
  color: #dc2626;
  font-weight: bold;
}

/* 数据看板纯净样式 */
.dashboard-simple {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 上下部分纯粹通过 gap 隔开 */
}

.board-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.board-row .card-simple {
  flex: 1;
}

.card-simple {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: #64748b;
}

.value {
  font-size: 22px;
  font-weight: bold;
  color: #0f172a;
}

.unit {
  font-size: 13px;
  font-weight: normal;
  color: #94a3b8;
  margin-left: 1px;
}

/* 移动端自适应 */
@media (max-width: 600px) {
  .top-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .board-row {
    flex-direction: column;
    gap: 10px;
  }
}
</style>