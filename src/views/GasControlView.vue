
<template>
  <div class="single-control-container">
    <div class="window-card" :class="'status-' + windowTextStatus">
      
      <!-- 头部状态栏 -->
      <div class="card-header">
        <h3 class="window-name">🪟 气调仓 - 主电动窗控制</h3>
        <!-- 根据后端返回的文本状态展示对应的指示灯 -->
        <span class="status-badge" :class="windowTextStatus">
          {{ formatStatus(windowTextStatus) }}
        </span>
      </div>

      <!-- 仿真百叶窗开合视觉效果 -->
      <div class="window-visual-box">
        <div class="visual-shutter" :style="{ height: getVisualHeight(windowTextStatus) }"></div>
        <p class="visual-text">仓内气流状态示意</p>
      </div>

      <!-- 核心控制按钮：点击时分别传入 1, 2, 3 -->
      <div class="action-buttons">
        <button 
          @click="sendAction(1)" 
          :disabled="windowTextStatus === 'opened'"
          class="btn btn-open"
        >⚡ 开启窗户 (1)</button>
        
        <button 
          @click="sendAction(2)" 
          :disabled="windowTextStatus === 'closed'"
          class="btn btn-close"
        >🔒 关闭窗户 (2)</button>
        
        <button 
          @click="sendAction(3)" 
          :disabled="windowTextStatus === 'stopped'"
          class="btn btn-stop"
        >🛑 紧急暂停 (3)</button>
      </div>

      <!-- 底栏状态栏 -->
      <p v-if="feedbackMessage" class="feedback-msg">ℹ️ {{ feedbackMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// 💡 注意：局域网联调时，请将下方 IP 换成你运行 FastAPI 后端的那台电脑的实际局域网 IP
const BACKEND_IP = '192.168.1.50'; 
const API_BASE = `http://${BACKEND_IP}:8000/api/气调模块`;

const windowTextStatus = ref('stopped'); // 存储纯文本状态，如 'opened', 'closed', 'stopped'
const feedbackMessage = ref('');

const formatStatus = (status) => {
  const map = {
    opened: '已彻底开启',
    closed: '已彻底关闭',
    stopped: '已安全暂停'
  };
  return map[status] || '通信同步中...';
};

// 窗户视觉高度变化计算
const getVisualHeight = (status) => {
  if (status === 'closed') return '100%'; // 关闭时百叶窗全拉下
  if (status === 'stopped') return '50%';  // 暂停在中间
  return '0%';                            // 开启时百叶窗收起
};

// 从后端获取单窗状态
const fetchWindowStatus = async () => {
  try {
    // const res = await axios.get(`${API_BASE}/window/status`);
    // res.data 包含 status_code 和 status_text
    windowTextStatus.value = res.data.status_text;
  } catch (err) {
    feedbackMessage.value = '上位机网络中断，请检查局域网连接及 8000 端口。';
  }
};

// 💡 核心动作：直接下发数字 1, 2, 3 给后端
const sendAction = async (code) => {
  const actionName = code === 1 ? '开启' : (code === 2 ? '关闭' : '暂停');
  feedbackMessage.value = `正在下发指令 [值: ${code}] 至 PLC 寄存器...`;
  
  // 前端乐观更新视觉状态，防止物理延迟导致卡顿感
  if (code === 1) windowTextStatus.value = 'opened';
  if (code === 2) windowTextStatus.value = 'closed';
  if (code === 3) windowTextStatus.value = 'stopped';

  try {
    const res = await axios.post(`${API_BASE}/window/control`, { 
      action_value: code  //#  匹配后端 SingleControlSchema 中的字段名
    });
    
    windowTextStatus.value = res.data.current_status_text;
    feedbackMessage.value = `PLC 寄存器写入成功，动作【${actionName}】已响应。`;
  } catch (err) {
    feedbackMessage.value = '指令发送失败，PLC 链路可能占线或发生未知错误。';
    fetchWindowStatus(); // 报错时自动拉取硬件真实状态进行还原
  }
};

onMounted(() => {
  // fetchWindowStatus();
  // 每 2 秒前端自动拉取一次状态，与后端 Polling 保持同步
  // setInterval(fetchWindowStatus, 2000);
});
</script>

<style scoped>
.single-control-container {
  max-width: 500px;
  margin: 40px auto;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.window-card {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  color: #fff;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.window-name { margin: 0; font-size: 18px; color: #e0e0e0; }

/* 状态标签 */
.status-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.status-badge.opened { background: rgba(40,167,69,0.2); color: #28a745; border: 1px solid #28a745; }
.status-badge.closed { background: rgba(0,123,255,0.2); color: #007bff; border: 1px solid #007bff; }
.status-badge.stopped { background: rgba(220,53,69,0.2); color: #dc3545; border: 1px solid #dc3545; }

/* 窗户模拟盒 */
.window-visual-box {
  height: 160px;
  background: #2d2d2d;
  border: 2px solid #444;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.visual-shutter {
  position: absolute;
  top: 0; left: 0; right: 0;
  background: linear-gradient(180deg, #555 0%, #333 100%);
  border-bottom: 3px solid #ffc107;
  transition: height 0.6s ease-in-out;
}
.visual-text { position: relative; z-index: 2; font-size: 13px; color: #888; }

/* 工业按钮 */
.action-buttons { display: flex; flex-direction: column; gap: 10px; }
.btn {
  padding: 12px;
  font-size: 15px;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
}
.btn:disabled { background: #333 !important; color: #666; cursor: not-allowed; }
.btn-open { background: #28a745; }
.btn-open:hover:not(:disabled) { background: #218838; }
.btn-close { background: #007bff; }
.btn-close:hover:not(:disabled) { background: #0069d9; }
.btn-stop { background: #dc3545; }
.btn-stop:hover:not(:disabled) { background: #c82333; }

.feedback-msg { margin-top: 15px; color: #ffc107; font-family: monospace; font-size: 13px; text-align: center; }
</style>
