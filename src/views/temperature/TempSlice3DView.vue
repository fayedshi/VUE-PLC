<template>
  <div class="page-container">
    <h2>三维粮温切面图</h2>
    <div class="slider-box">
      <label>切面层选择（X/Y/Z轴）：</label>
      <input type="range" min="1" max="5" value="3" />
    </div>
    <div class="card mock-slice">
      <p>[📐 3D 空间切片分析 - 展示特定高度/纵深的粮食内部温度投影]</p>
    </div>
  </div>
</template>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.slider-box { margin-bottom: 15px; color: #a0aec0; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.mock-slice { height: 450px; display: flex; justify-content: center; align-items: center; color: #4a5568; border-style: dashed; }
</style>
