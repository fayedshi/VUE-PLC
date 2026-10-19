<template>
  <!-- <el-icon>
            <Compass />
          </el-icon> -->
  <el-container class="layout-container">

    <el-aside width="220px" class="aside-menu">
      <div class="logo">🌾 智慧粮库管理系统</div>
      <el-menu :default-active="$route.path" router background-color="#304156" text-color="#bfcbd9"
        active-text-color="#409EFF">
        <el-menu-item index="/">
          <span>粮情看板</span>
        </el-menu-item>
        <el-menu-item index="/users" v-if="role=='admin'">

          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/alarms">

          <span>系统报警</span>
        </el-menu-item>
        <el-menu-item index="/system">

          <span>系统主页</span>
        </el-menu-item>
        <el-menu-item index="/settings">

          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>

      <el-header class="layout-header">
        <div v-if="username" class="header-left">当前用户：{{ username }} ({{ role }})</div>
        <el-button style="margin-left: 10px;" size="middle" @click="handleLogout">{{ username ? "退出" : "登录" }}</el-button>
        <!-- <el-button v-else type="danger" size="small" @click="handleLogout">登录</el-button> -->
      </el-header>

      <el-main class="layout-main">

        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- <div class="navigate">
    <h1>智慧粮库管理系统</h1>
    <nav>
      <RouterLink :to="{ name: 'Dashboard' }" exact-active-class="active">看板</RouterLink>
      <RouterLink :to="{ name: 'System' }" active-class="active">系统主页</RouterLink>
      <RouterLink to="/settings" active-class="active">系统设置</RouterLink>
      <RouterLink to="/tasks" active-class="active">任务计划</RouterLink>

      <RouterLink to="/alarms" active-class="active">系统报警</RouterLink>
      <RouterLink to="/permissions" active-class="active">权限管理</RouterLink>
    </nav>
  </div> -->
  <!-- <RouterLink to="/data-center" active-class="active">数据中心</RouterLink> -->
  <!-- <RouterLink to="/air-tightness" active-class="active">气密性检测</RouterLink>
      <RouterLink to="/mobile-control" active-class="active">手机控制</RouterLink> -->
  <!-- <div class="main-content">
    <RouterView></RouterView>
  </div> -->

</template>

<script setup>
import { RouterView, RouterLink } from 'vue-router';

import { useRouter } from 'vue-router';
import { Compass, User } from '@element-plus/icons-vue';

const router = useRouter();
// const username = localStorage.getItem('username') || '未知';
const username = localStorage.getItem('username');
const role = localStorage.getItem('role');

const handleLogout = () => {
  localStorage.clear() // 清除 token 和用户信息
  router.push('/login')
};
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
  height: 45px;
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
  /* padding: 20px; */
  /* 四周留白，不让文字贴边 */
  min-height: 80vh;
  /* 保证内容少时也不会显得太短 */
  /* background-color: #5c6f6c; */
  /* 背景通常设为白色或浅灰色 */
  margin: 0 auto;
  /* 配合 max-width 实现水平居中 */
  /* max-width: 1200px; */
  /* 限制最大宽度，防止大屏下文字排得太稀疏 */
}

.layout-container {
  height: 100vh;
}

.aside-menu {
  background-color: #304156;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  background: #2b3643;
}

.el-menu--horizontal .el-menu-item {
  padding: 50 50px;
  /* 默认通常是 20px，调小可以缩短间隙，调大可以拉开间隙 */
}

.layout-header {
  background: #fff;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}

.layout-main {
  background: #f0f2f5;
  padding: 20px;
}
</style>