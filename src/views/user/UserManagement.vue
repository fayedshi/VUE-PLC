<template>
    <div class="user-management">
        <div class="header-actions">
            <h3>👥 用户管理账户中心</h3>
            <el-button v-if="isSuperAdmin" type="primary" icon="Plus" @click="openAddDialog">添加用户</el-button>
        </div>

        <!-- 访客视图兜底提示 -->
        <el-alert v-if="!isSuperAdmin" title="当前角色为 [访客]，无权修改用户信息，仅供查阅。" type="warning" show-icon :closable="false" />

        <!-- 用户表格 -->
        <el-table :data="userList" stripe style="width: 100%; margin-top: 20px" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="role" label="系统角色">
                <template #default="scope">
                    <!-- 建议：这里的判断和显示可以根据您之前写的 Enum 进行匹配调整 -->
                    <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'success'">
                        {{ scope.row.role }} <!-- 注意：这里原先的 currentRole 可能是个误笔，应该绑定当前行的 role -->
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" />

            <!-- ⚙️ 统一的操作列（仅超级管理员可见） -->
            <el-table-column label="操作" width="220">
                <template #default="scope">


                    <!-- 2. 删除按钮 -->
                    <el-button type="danger" size="small" icon="Delete"
                        :disabled="scope.row.username === 'admin' || scope.row.username === currentUser"
                        @click="handleDelete(scope.row)">
                        删除
                    </el-button>
                    <!-- 1. 重置密码按钮（使用 primary 或 warning 蓝色/黄色调，与删除的红色错开） -->
                    <el-button typtype="warning" icon="Refresh" @click="handleResetPassword(scope.row)"
                        :disabled="scope.row.username === 'admin'">
                        重置密码
                    </el-button>
                </template>
            </el-table-column>
        </el-table>


        <!-- 添加用户弹窗 -->
        <el-dialog v-model="dialogVisible" title="新增用户" width="400px">
            <el-form :model="userForm" label-width="80px">
                <el-form-item label="用户名">
                    <el-input v-model="userForm.username" />
                </el-form-item>
                <!-- <el-form-item label="密码">
                    <el-input v-model="userForm.password" type="password" show-password />
                </el-form-item> -->
                <el-form-item label="角色">
                    <el-select v-model="userForm.role" style="width: 100%" placeholder="请选择">
                        <el-option v-for="role in roleList" :key="role.name" :label="role.desc" :value="role.name" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitAddUser">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '../../../api/http';

const userList = ref([]);
const roleList = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);

const currentRole = localStorage.getItem('role');
const currentUser = localStorage.getItem('username');
const isSuperAdmin = computed(() => currentRole === 'SUPER_ADMIN');

const userForm = ref({ username: '', password: '', role: '' });

// 获取用户列表
const fetchUsers = async () => {
    if (!isSuperAdmin.value) return; // 访客不请求列表，由前端隔离或展示空白
    loading.value = true;
    try {
        const res = await http.get('/api/users');
        userList.value = res.data;
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const fetchRoles = async () => {
    if (!isSuperAdmin.value) return; // 访客不请求列表，由前端隔离或展示空白
    loading.value = true;
    try {
        const res = await http.get('/api/roles');
        roleList.value = res.data;
        console.log(roleList.value)
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const handleResetPassword = (row) => {
    ElMessageBox.confirm(
        `确定要重置保管员 [ ${row.username} ] 的登录密码吗？`,
        '安全警告',
        {
            confirmButtonText: '确定重置',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(async () => {
        try {
            // 发起后端请求，传入该用户的 ID
            const response = await http.post(`/api/admin/users/${row.id}/reset-password`)
            const initialPassword = response.data.data.initial_password

            // 成功弹窗，并提供一键复制初始密码的提示
            ElMessageBox.alert(
                `该职工密码已重置成功！<br/>初始随机密码为：<b style="color: #f56c6c; font-size: 16px;">${initialPassword}</b><br/><br/>请将此密码告知该用户`,
                // `该职工密码已重置成功！<br/>初始随机密码为：<b style="color: #f56c6c; font-size: 16px;">${initialPassword}</b><br/><br/>请将此密码告知该职工，其下次登录时系统将强制要求其修改密码。`,
                '重置成功',
                {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: '我知道了'
                }
            )
        } catch (error) {
            const errorMsg = error.response?.data?.detail || '重置失败，请检查网络或管理员权限'
            ElMessage.error(errorMsg)
        }
    }).catch(() => {
        ElMessage.info('已取消重置操作')
    })
}

const openAddDialog = () => {
    userForm.value = { username: '', password: '', role: '' };
    dialogVisible.value = true;
};

// 提交新用户
const submitAddUser = async () => {
    if (!userForm.value.username || !userForm.value.role) {
        return ElMessage.warning('请填写完整信息');
    }
    try {
        const response = await http.post('/api/users', userForm.value);
        // ElMessage.success('用户创建成功,'response);
        const initialPassword = response.data.data.initial_password

        // 成功弹窗，并提供一键复制初始密码的提示
        ElMessageBox.alert(
            `创建用户成功！<br/>初始随机密码为：<b style="color: #f56c6c; font-size: 16px;">${initialPassword}</b><br/><br/>请将此密码告知该用户`,
            // `该职工密码已重置成功！<br/>初始随机密码为：<b style="color: #f56c6c; font-size: 16px;">${initialPassword}</b><br/><br/>请将此密码告知该职工，其下次登录时系统将强制要求其修改密码。`,
            '创建成功',
            {
                dangerouslyUseHTMLString: true,
                confirmButtonText: '我知道了'
            }
        )
        dialogVisible.value = false;
        fetchUsers();
    } catch (err) {
        ElMessage.error(err)
        // console.error(err);
    }
};

// 删除用户
const handleDelete = (row) => {
    ElMessageBox.confirm(`确定要删除用户 [ ${row.username} ] 吗？`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        try {
            await http.delete(`/api/users/${row.id}`);
            ElMessage.success('删除成功');
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    }).catch(() => { });
};

onMounted(async () => {
    await fetchUsers();
    await fetchRoles();
});
</script>

<style scoped>
.user-management {
    padding: 20px;
    background: #fff;
    border-radius: 8px;
}

.header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
</style>
