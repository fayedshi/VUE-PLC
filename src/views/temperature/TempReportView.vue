<template>
  <div class="page-container">
    <h2>综合温度报表</h2>
    <div class="card">
      <table class="data-table">
        <thead>
          <tr><th>点位编号</th><th>粮食种类</th><th>当前温度</th><th>测温时间</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td>T-001</td><td>小麦</td><td>18.5 ℃</td><td>2026-08-08</td><td><span class="tag normal">正常</span></td></tr>
          <tr><td>T-002</td><td>小麦</td><td>19.2 ℃</td><td>2026-08-08</td><td><span class="tag normal">正常</span></td></tr>
          <tr><td>T-003</td><td>玉米</td><td>24.1 ℃</td><td>2026-08-08</td><td><span class="tag warn">偏高</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 12px; border-bottom: 1px solid #222f43; }
.data-table th { color: #a0aec0; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.normal { background: #005533; color: #00ff88; }
.tag.warn { background: #553300; color: #ffaa00; }
</style>
