<template>
  <div class="page-container">
    <h2>粮情 3D 及点位分析</h2>
    <div class="card mock-3d">
      <div class="placeholder-text">🌐 [3D 仓房模型占位符 - 可在此集成 Three.js / WebGL]</div>
      <div class="status-bar">当前检测仓储：1号粮仓 | 总点位：128个 | 异常点位：0</div>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.mock-3d { height: 500px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: radial-gradient(circle, #1a2436 0%, #0f141c 100%); position: relative; }
.placeholder-text { color: #4a5568; font-size: 16px; }
.status-bar { position: absolute; bottom: 20px; left: 20px; color: #00ffcc; font-size: 14px; }
</style>
