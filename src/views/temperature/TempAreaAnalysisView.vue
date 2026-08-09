<template>
  <div class="page-container">
    <h2>区域粮温分析表</h2>
    <div class="grid-layout">
      <div class="card area-card"><h3>东区 (仓门侧)</h3><p>平均温: 17.2℃</p></div>
      <div class="card area-card"><h3>西区 (遮阳侧)</h3><p>平均温: 16.5℃</p></div>
      <div class="card area-card"><h3>核心区 (中心)</h3><p>平均温: 19.8℃</p></div>
      <div class="card area-card"><h3>表层 (空气接触面)</h3><p>平均温: 22.4℃</p></div>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.grid-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.area-card h3 { color: #00ffcc; margin-bottom: 10px; }
</style>
