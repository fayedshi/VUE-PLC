<template>
  <div class="navigate">
      <!-- 二级子菜单导航 -->
      <RouterLink to="/temperature/" exact-active-class="active">温度变化曲线</RouterLink>
      <!-- <RouterLink to="/temperature/comparison" active-class="active">粮情点位比较</RouterLink> -->
      <!-- <RouterLink to="/temperature/slice-3d" active-class="active">三维粮温切面图</RouterLink> -->
      <RouterLink to="/temperature/report" active-class="active">测温点位全览</RouterLink>
      <!-- <RouterLink to="/temperature/area-analysis" active-class="active">区域粮温分析表</RouterLink> -->
      <!-- <RouterLink to="/temperature/curve-chart" active-class="active">温湿度变化曲线</RouterLink> -->
      <!-- <RouterLink to="/temperature/heatmap" active-class="active">温度云图</RouterLink> -->
  </div>
  
  <div>
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.navigate {
  display: flex;
  /* 开启弹性布局 */
  justify-content: center;
  /* 居中对齐（也可选 space-around 分散对齐） */
  align-items: center;
  /* 垂直居中 */
  gap: 20px;
  /* 导航项之间的间距 */
  padding: 10px 0;
  /* 上下内边距 */
  background-color: #f8f9fa;
  /* 浅灰色背景 */
  border-bottom: 1px solid #ddd;
  /* 底部分割线 */
}

.temp-layout {
  display: flex;
  height: 100vh;
  background: #0f141c;
  color: #e2e8f0;
  font-family: sans-serif;
}

.temp-sidebar {
  width: 240px;
  background: #141b26;
  border-right: 1px solid #222f43;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 20px;
  font-size: 16px;
  font-weight: bold;
  color: #00ffcc;
  border-bottom: 1px solid #222f43;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 8px;
}

.sidebar-menu a {
  padding: 12px 15px;
  color: #a0aec0;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s;
  font-size: 14px;
}

.sidebar-menu a:hover {
  background: #1e293b;
  color: #fff;
}

.sidebar-menu a.active {
  background: #00ffcc22;
  color: #00ffcc;
  font-weight: bold;
  border-left: 4px solid #00ffcc;
}

.temp-main {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
}

.main-content {
  padding: 20px;
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
