<template>

  <div class="navigate">
    <RouterLink to="/" active-class="active">测温系统</RouterLink>
    <RouterLink to="/news" active-class="active">News</RouterLink>
    <RouterLink to="/publics" active-class="active">Publics</RouterLink>
    <RouterLink to="/about" active-class="active">About</RouterLink>
  </div>

  <div class="main-content">
    <RouterView></RouterView>
  </div>

</template>

<script setup>
import { RouterView, RouterLink } from 'vue-router';

</script>

<style>
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

.navigate a {
  color: rgb(94, 88, 104);
  text-decoration: none;
  margin: 0 15px;
}

.navigate a.active {
  color: #42b883;
  /* 激活时变绿色 */
  font-weight: bold;
  /* 加粗 */
  border-bottom: 2px solid #42b883;
  /* 底部加个横线 */
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
  max-width: 1200px;
  /* 限制最大宽度，防止大屏下文字排得太稀疏 */
}
</style>