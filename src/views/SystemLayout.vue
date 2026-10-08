<template>
 
  <div class="system-navigate">
    <nav>
      <RouterLink to="/temperature" active-class="active">测温系统</RouterLink>
      <!-- <RouterLink to="/gas-control" active-class="active">气调系统</RouterLink> -->
      <RouterLink to="/ventilation" active-class="active">通风系统</RouterLink>      
      <RouterLink to="/power" active-class="active">能耗监测</RouterLink>
      
      <RouterLink to="/ca" active-class="active">气调系统</RouterLink>
      <RouterLink to="/hvac" active-class="active">空调系统</RouterLink>
      <RouterLink to="/environment-monitor" active-class="active">环境监测</RouterLink>
    </nav>
  </div>

  <div class="main-content">
    <RouterView></RouterView>
  </div>

</template>

<script setup>
import { RouterView, RouterLink } from 'vue-router';

</script>

<style>
h1 {
  color: #333;
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

.system-navigate {
  display: flex;
  /* 开启弹性布局 */
  justify-content: center;
  /* 居中对齐（也可选 space-around 分散对齐） */
  align-items: center;
  /* 垂直居中 */
  gap: 20px;
  /* 导航项之间的间距 */
  padding: 0 0;
  /* 上下内边距 */
  background-color: #f8f9fa;
  /* 浅灰色背景 */
  border-bottom: 1px solid #ddd;
  /* 底部分割线 */
}

.system-navigate a {
  color: rgb(94, 88, 104);
  text-decoration: none;
  margin: 0 15px;
}

.system-navigate a.active {
  color: #42b883;
  /* 激活时变绿色 */
  font-weight: bold;
  /* 加粗 */
  border-bottom: 2px solid #42b883;
  /* 底部加个横线 */
}

.main-content {
  /* padding: 20px; */
  /* 四周留白，不让文字贴边 */
  min-height: 80vh;
  /* 保证内容少时也不会显得太短 */
  background-color: #5c6f6c;
  /* 背景通常设为白色或浅灰色 */
  margin: 0 auto;
  /* 配合 max-width 实现水平居中 */
  /* max-width: 1200px; */
  /* 限制最大宽度，防止大屏下文字排得太稀疏 */
}
</style>