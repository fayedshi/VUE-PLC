<template>
    <div class="login-container">
        <el-card class="login-card">
            <h2>🌾 储粮上位机系统</h2>
            <el-form :model="loginForm" label-width="0">
                <el-form-item>
                    <el-input v-model="loginForm.username" placeholder="请输入用户名" prefix-icon="User" />
                </el-form-item>
                <el-form-item>
                    <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" prefix-icon="Lock"
                        show-password />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" class="login-btn" @click="handleLogin" :loading="loading">登 录</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../../api/http'; // 根据实际路径修改

const router = useRouter();
const loading = ref(false);
const loginForm = reactive({ username: '', password: '' });

const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
        return ElMessage.warning('请输入用户名和密码');
    }
    loading.value = true;
    try {
        const res = await http.post('/api/login', {
            username: loginForm.username,
            password: loginForm.password,
            role: 'visitor' // 契合后端校验格式，登录时不看此角色
        });
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('username', loginForm.username);
        ElMessage.success('登录成功');
        router.push('/');
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #f3f4f6;
}

.login-card {
    width: 400px;
    text-align: center;
    padding: 20px;
}

.login-btn {
    width: 100%;
}

h2 {
    margin-bottom: 30px;
    color: #303133;
}
</style>
