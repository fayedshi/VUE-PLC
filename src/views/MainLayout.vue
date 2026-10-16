<template>
  <el-container class="layout-container">
    <!-- 左侧菜单栏 -->
    <el-aside width="220px" class="aside-menu">
      <div class="logo">🌾 智慧粮库管理系统</div>
      <el-menu :default-active="$route.path" router background-color="#304156" text-color="#bfcbd9"
        active-text-color="#409EFF">
        <el-menu-item index="/">
          <el-icon>
            <Compass />
          </el-icon>
          <span>粮情主控台</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon>
            <User />
          </el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/alarms">
          <el-icon>
            <User />
          </el-icon>
          <span>系统报警</span>
        </el-menu-item>
        <el-menu-item index="/main">
          <el-icon>
            <!-- <User /> -->
          </el-icon>
          <span>系统主页</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部信息栏 -->
      <el-header class="layout-header">
        <div class="header-left">当前值班员：{{ username }} ({{ role === 'admin' ? '管理员' : '访客' }})</div>
        <el-button type="danger" size="small" @click="handleLogout">退出登录</el-button>
      </el-header>

      <!-- 右侧核心内容区域 -->
      <el-main class="layout-main">
        <!-- 核心：子路由的出口（Dashboard 或 UserManagement 会显示在这里） -->
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- <div class="navigate">
    <h1>智慧粮库管理系统</h1>
    <nav>
      <RouterLink to="/" exact-active-class="active">首页</RouterLink>
      <RouterLink to="/main" active-class="active">系统主页</RouterLink>
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
const username = localStorage.getItem('username') || '未知';
const role = localStorage.getItem('role');

const handleLogout = () => {
  localStorage.clear(); // 清除 token 和用户信息
  router.push('/login');
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
  background-color: #5c6f6c;
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

.layout-header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}

.layout-main {
  background: #f0f2f5;
  padding: 20px;
}
</style>