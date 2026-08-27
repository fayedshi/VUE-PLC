<template>
  <!-- 全局容器，确保页面有基本高度 -->
  <div class="page-container">
    
    <!-- 左上角按钮控制台 -->
    <div class="button-console">
      
      <!-- 第一组：控制模式切换（远程 / 本地） -->
      <div class="btn-group">
        <button 
          :class="{ active: controlMode === 'remote' }" 
          @click="switchControlMode('remote')"
        >
          远程
        </button>
        <button 
          :class="{ active: controlMode === 'local' }" 
          @click="switchControlMode('local')"
        >
          本地
        </button>
      </div>

      <!-- 第二组：运行模式切换（手动 / 自动） -->
      <div class="btn-group">
        <button 
          :class="{ active: runMode === 'manual' }" 
          @click="switchRunMode('manual')"
        >
          手动
        </button>
        <button 
          :class="{ active: runMode === 'auto' }" 
          @click="switchRunMode('auto')"
        >
          自动
        </button>
      </div>
      
    </div>

    <!-- 页面其余内容展示（可删掉） -->
    <div class="content">
      <h3>当前系统状态</h3>
      <p>控制模式：<strong>{{ controlMode === 'remote' ? '🌐 远程' : '💻 本地' }}</strong></p>
      <p>运行模式：<strong>{{ runMode === 'manual' ? '🛠️ 手动' : '🤖 自动' }}</strong></p>
    </div>
    
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 1. 定义两组状态的响应式变量（设置默认值）
const controlMode = ref('remote') // 默认远程
const runMode = ref('manual')     // 默认手动

// 2. 第一组按钮的切换逻辑
const switchControlMode = (mode) => {
  if (controlMode.value === mode) return // 如果点击的是已激活的按钮，不重复处理
  
  controlMode.value = mode
  const modeText = mode === 'remote' ? '远程' : '本地'
  
  // 这里使用原生 alert 提示，如果你用了 Element Plus 可以换成 ElMessage
  alert(`控制模式已切换为：${modeText}模式`)
}

// 3. 第二组按钮的切换逻辑
const switchRunMode = (mode) => {
  if (runMode.value === mode) return
  
  runMode.value = mode
  const modeText = mode === 'manual' ? '手动' : '自动'
  
  alert(`运行模式已切换为：${modeText}模式`)
}
</script>

<style scoped>
/* 页面基础样式 */
.page-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
}

/* 核心：将控制台固定在页面左上方 */
.button-console {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 15px; /* 两组按钮之间的间距 */
  z-index: 10;
}

/* 按钮组样式 */
.btn-group {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 按钮默认样式 */
.btn-group button {
  border: 1px solid #dcdfe6;
  background-color: #ffffff;
  color: #606266;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

/* 消除双按钮并排时中间边框变粗的问题 */
.btn-group button:not(:first-child) {
  border-left: none;
}

/* 鼠标悬停样式 */
.btn-group button:hover {
  color: #409eff;
  background-color: #ecf5ff;
}

/* 🌟 核心：按钮激活（选中）时的样式 */
.btn-group button.active {
  background-color: #409eff;
  color: #ffffff;
  border-color: #409eff;
}

/* 页面主内容展示样式（与按钮无关，仅作好看） */
.content {
  margin-top: 80px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
</style>
