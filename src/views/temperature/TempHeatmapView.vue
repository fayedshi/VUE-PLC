<template>
  <div class="page-container">
    <h2>温度云图 (Heatmap)</h2>
    <div class="card mock-heatmap">
      <div class="color-bar">冷 🔵 🟢 🟡 🔴 热</div>
      <p>[🔥 热力云图渲染区域 - 直观呈现粮食内部是否存在局部积热、发热点]</p>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.mock-heatmap { height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #4a5568; position: relative; }
.color-bar { position: absolute; top: 20px; right: 20px; color: #fff; font-size: 12px; }
</style>
