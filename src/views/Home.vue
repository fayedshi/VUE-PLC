<template>
  <div class="app-container">
    
    <!-- 状态显示栏 -->
    <div class="connection-status" :class="{ 'connected': isConnected }">
      网络状态：{{ isConnected ? '已连接 (ONLINE)' : '断开中 (OFFLINE)' }}
    </div>

    <!-- 数据实时看板 -->
    <div class="data-board">
      <div class="data-card">
        <span class="label">实时温度1</span>
        <span class="value">{{ temperatures[79] }} ℃</span>
      </div>
      <div class="data-card">
        <span class="label">实时温度2</span>
        <span class="value">{{ temperatures[80] }} ℃</span>
      </div>
      <!-- <div class="data-card">
        <span class="label">实时湿度1</span>
        <span class="value">{{ temp_humid[0] }} </span>
      </div> -->
      <!-- <div class="data-card">
        <span class="label">实时湿度2</span>
        <span class="value">{{ temp_humid[1] }}</span>
      </div>-->
      <div class="data-card">
        <span class="label">系统状态</span>
        <span class="value status-text">{{ status }}</span>
      </div> 
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

// 1. 定义响应式变量
const isConnected = ref(false);
const temperatures=ref([])
const temp_humid=ref([])
const status=ref('Running')
// const plcData = ref({ temperature: 0.0, pressure: 0.0, status: 'UNKNOWN' });
let socket = null;

// 2. 建立 WebSocket 连接函数
const initWebSocket = () => {
  // 如果在电脑本机测试，保持 localhost；如果要手机访问，请改为工控机的局域网 IP
  socket = new WebSocket('ws://192.168.0.16:8000/ws/live');

  // 连接成功事件
  socket.onopen = () => {
    isConnected.value = true;
    console.log('成功连接到 Python 后端 WebSocket！');
  };

  // 接收到后端实时数据事件
  socket.onmessage = (event) => {
    // 解析后端传过来的 JSON 字符串
    const res = JSON.parse(event.data);
    // 直接赋值，Vue 3 会自动、高效地刷新界面上对应的数字
    temperatures.value= res;
  };

  // 连接关闭事件
  socket.onclose = () => {
    isConnected.value = false;
    // console.log('【前端提示】连接已断开，3秒后尝试自动重连...');
    setTimeout(initWebSocket, 3000); // 掉线自动重连机制
  };

  // 发生错误事件
  socket.onerror = (error) => {
    console.error('【前端提示】WebSocket 发生错误:', error);
  };
};

// 3. 生命周期：组件加载时启动连接
onMounted(() => {
  console.log('ready to start fetching plc backend data')
  initWebSocket();
});

// 4. 生命周期：组件销毁时关闭连接，释放工控机内存
onBeforeUnmount(() => {
  if (socket) socket.close();
});
</script>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 50px auto;
  font-family: Arial, sans-serif;
  text-align: center;
}

.connection-status {
  display: inline-block;
  padding: 8px 15px;
  background-color: #ff4d4f;
  color: white;
  border-radius: 20px;
  font-weight: bold;
  margin-bottom: 30px;
}
.connection-status.connected {
  background-color: #52c41a;
}
.data-board {
  display: flex;
  justify-content: space-around;
  gap: 20px;
}
.data-card {
  flex: 1;
  background: #f0f2f5;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.label {
  display: block;
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 10px;
}
.value {
  font-size: 28px;
  font-weight: bold;
  color: #1890ff;
}
.status-text { color: #faad14; }
</style>