<template>
  <div class="page-container">
    <h2>粮情点位比较</h2>
    <div class="toolbar">
      <button class="btn">选择对比仓房</button>
      <button class="btn">选择时间跨度</button>
    </div>
    <div class="card mock-chart">
      <p>[📊 柱状对比图占位符 - 对比不同点位的历史最高/最低/平均温差]</p>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.toolbar { margin-bottom: 15px; display: flex; gap: 10px; }
.btn { background: #222f43; border: 1px solid #4a5568; color: #fff; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.mock-chart { height: 400px; display: flex; justify-content: center; align-items: center; color: #4a5568; }
</style>
