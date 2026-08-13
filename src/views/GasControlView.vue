<template>
  <div class="window-control-module">
    <!-- 1. 顶部：智能批量控制面板 -->
    <div class="panel batch-panel">
      <h3>🏢 气调控制面板</h3>
      
      <div class="batch-selection-bar">
        <!-- 全选/全不选 快捷控制 -->
        <label class="checkbox-label select-all">
          <input 
            type="checkbox" 
            :checked="isAllSelected" 
            @change="toggleSelectAll" 
          />
          <span class="checkbox-text">全选 / 反选</span>
        </label>
        <span class="selected-count">已选中 {{ selectedWindowIds.length }} 个电动窗</span>
      </div>

      <!-- 批量动作按钮，如果没有选中任何窗户，则自动禁用 -->
      <div class="batch-buttons">
        <button 
          @click="sendBatchAction('open')" 
          :disabled="selectedWindowIds.length === 0" 
          class="btn btn-open"
        >⚡ 批量开启选中窗</button>
        
        <button 
          @click="sendBatchAction('stop')" 
          :disabled="selectedWindowIds.length === 0" 
          class="btn btn-stop"
        >🛑 批量暂停选中窗</button>
        
        <button 
          @click="sendBatchAction('close')" 
          :disabled="selectedWindowIds.length === 0" 
          class="btn btn-close"
        >🔒 批量关闭选中窗</button>
      </div>
      <p v-if="globalMessage" class="global-msg">{{ globalMessage }}</p>
    </div>

    <!-- 2. 底部：8个电动窗独立控制网格 -->
    <div class="window-grid">
      <div 
        v-for="win in windows" 
        :key="win.id" 
        class="window-card"
        :class="[
          'status-' + win.status, 
          { 'card-selected': selectedWindowIds.includes(win.id) }
        ]"
      >
        <div class="card-header">
          <!-- 💡 每个窗户新增勾选框，绑定选中的 ID 数组 -->
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              :value="win.id" 
              v-model="selectedWindowIds" 
            />
            <span class="window-name">🪟 {{ win.name }}</span>
          </label>
          
          <!-- 状态指示灯 -->
          <span class="status-badge" :class="win.status">
            {{ formatStatus(win.status) }}
          </span>
        </div>

        <!-- 动画模拟窗户开合状态 -->
        <div class="window-visual">
          <div class="visual-bar" :style="{ width: getVisualWidth(win.status) }"></div>
        </div>

        <!-- 独立控制动作 -->
        <div class="action-buttons">
          <button 
            @click="sendSingleAction(win.id, 'open')" 
            :disabled="win.status === 'opening' || win.status === 'opened'"
            class="btn-s btn-s-open"
          >开启</button>
          
          <button 
            @click="sendSingleAction(win.id, 'stop')" 
            :disabled="win.status === 'stopped'"
            class="btn-s btn-s-stop"
          >暂停</button>
          
          <button 
            @click="sendSingleAction(win.id, 'close')" 
            :disabled="win.status === 'closing' || win.status === 'closed'"
            class="btn-s btn-s-close"
          >关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/气调模块';
const globalMessage = ref('');

// 💡 核心存储：记录当前被勾选的电动窗 ID 数组
const selectedWindowIds = ref([]);

// 初始化 8 个电动窗的本地状态
const windows = ref(
  Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `${i + 1}号电动窗`,
    status: 'stopped'
  }))
);

// 💡 计算属性：判断当前是否所有窗户都被勾选了
const isAllSelected = computed(() => {
  return windows.value.length > 0 && selectedWindowIds.value.length === windows.value.length;
});

// 💡 快捷键：全选 / 全不选切换
const toggleSelectAll = (event) => {
  if (event.target.checked) {
    selectedWindowIds.value = windows.value.map(w => w.id);
  } else {
    selectedWindowIds.value = [];
  }
};

const formatStatus = (status) => {
  const map = {
    opened: '已开启',
    closed: '已关闭',
    opening: '正在开启...',
    closing: '正在关闭...',
    stopped: '已暂停'
  };
  return map[status] || '未知';
};

const getVisualWidth = (status) => {
  if (status === 'opened' || status === 'opening') return '100%';
  if (status === 'stopped') return '50%';
  return '0%';
};

// 获取最新状态
const fetchStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE}/windows/status`);
    res.data.forEach(serverWin => {
      const target = windows.value.find(w => w.id === serverWin.id);
      if (target) target.status = serverWin.status;
    });
  } catch (err) {
    globalMessage.value = '无法获取电动窗实时状态。';
  }
};

// 动作 1：单窗控制
const sendSingleAction = async (id, action) => {
  globalMessage.value = `正在向 ${id}号窗 发送 [${action}] 指令...`;
  try {
    const res = await axios.post(`${API_BASE}/window/control`, { id, action });
    if (res.data.success) {
      globalMessage.value = `${id}号窗 指令执行成功！`;
      fetchStatus();
    }
  } catch (err) {
    globalMessage.value = `${id}号窗 控制失败。`;
  }
};

// 💡 动作 2：修正后的“勾选批量控制”
const sendBatchAction = async (action) => {
  const targetIds = [...selectedWindowIds.value];
  globalMessage.value = `正在对 ${targetIds.join(', ')} 号窗发送批量 [${action}] 指令...`;

  // 前端乐观更新：让选中的窗户先动起来
  windows.value.forEach(w => {
    if (targetIds.includes(w.id)) {
      if (action === 'open') w.status = 'opening';
      if (action === 'close') w.status = 'closing';
      if (action === 'stop') w.status = 'stopped';
    }
  });

  try {
    // 💡 配合勾选功能，前端将选中的 ID 数组（targetIds）直接传给后端
    const res = await axios.post(`${API_BASE}/window/batch-control`, { 
      action,
      ids: targetIds // 传给后端的指定 ID 列表
    });
    
    if (res.data.success) {
      globalMessage.value = `选中的电动窗批量 [${action}] 指令下发成功！`;
      fetchStatus();
    }
  } catch (err) {
    globalMessage.value = '批量控制部分或全部失败，请检查总线。';
    fetchStatus();
  }
};

onMounted(() => {
  fetchStatus();
});
</script>

<style scoped>
.window-control-module {
  max-width: 1000px;
  margin: 20px auto;
  font-family: 'Segoe UI', sans-serif;
  color: #fff;
}
.panel {
  background: #1e1e1e;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #333;
}
/* 批量勾选工具条 */
.batch-selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  background: #2a2a2a;
  padding: 10px 15px;
  border-radius: 6px;
}
.selected-count {
  color: #41b883;
  font-size: 14px;
  font-weight: bold;
}
.batch-buttons {
  display: flex;
  gap: 15px;
}
.btn {
  flex: 1;
  padding: 12px;
  font-size: 15px;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn:disabled {
  background: #444 !important;
  color: #888;
  cursor: not-allowed;
}
.btn-open { background: #28a745; color: white; }
.btn-open:hover:not(:disabled) { background: #218838; }
.btn-stop { background: #dc3545; color: white; }
.btn-stop:hover:not(:disabled) { background: #c82333; }
.btn-close { background: #007bff; color: white; }
.btn-close:hover:not(:disabled) { background: #0069d9; }

.global-msg { color: #ffc107; font-size: 14px; margin-top: 10px; font-family: monospace; }

/* 勾选框美化与布局 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 8列网格布局 */
.window-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
@media (max-width: 768px) { .window-grid { grid-template-columns: repeat(2, 1fr); } }

.window-card {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s;
}
/* 💡 被选中卡片的高亮视觉边缘线 */
.card-selected {
  border-color: #41b883;
  background: #2d3732;
}

.card-header { display: flex; justify-content: space-between; align-items: center; }
.window-name { font-weight: bold; font-size: 14px; }

.status-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.status-badge.opened { background: rgba(40,167,69,0.2); color: #28a745; }
.status-badge.closed { background: rgba(0,123,255,0.2); color: #007bff; }
.status-badge.opening { background: rgba(40,167,69,0.4); color: #fff; animation: blink 1s infinite; }
.status-badge.closing { background: rgba(0,123,255,0.4); color: #fff; animation: blink 1s infinite; }
.status-badge.stopped { background: rgba(220,53,69,0.2); color: #dc3545; }

.window-visual { height: 6px; background: #111; border-radius: 3px; overflow: hidden; }
.visual-bar { height: 100%; background: #41b883; transition: width 1s ease-in-out; }

.action-buttons { display: flex; gap: 5px; }
.btn-s { flex: 1; padding: 6px 0; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; color: #fff; background: #444; }
.btn-s:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-s-open:not(:disabled):hover { background: #218838; }
.btn-s-stop:not(:disabled):hover { background: #c82333; }
.btn-s-close:not(:disabled):hover { background: #0069d9; }

@keyframes blink { 50% { opacity: 0.5; } }
</style>
