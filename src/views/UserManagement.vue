<template>
    <div class="user-management">
        <div class="header-actions">
            <h3>👥 用户管理账户中心</h3>
            <el-button v-if="isAdmin" type="primary" icon="Plus" @click="openAddDialog">添加用户</el-button>
        </div>

        <!-- 访客视图兜底提示 -->
        <el-alert v-if="!isAdmin" title="当前角色为 [访客]，无权修改用户信息，仅供查阅。" type="warning" show-icon :closable="false" />

        <!-- 用户表格 -->
        <el-table :data="userList" stripe style="width: 100%; margin-top: 20px" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="role" label="系统角色">
                <template #default="scope">
                    <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'success'">
                        {{ scope.row.role === 'admin' ? '系统管理员' : '一般用户' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" />
            <el-table-column label="操作" width="180" v-if="isAdmin">
                <template #default="scope">
                    <el-button type="danger" size="small" icon="Delete" :disabled="scope.row.username === 'admin' || scope.row.username ===  currentUser "
                        @click="handleDelete(scope.row)">
                        删除
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
                <el-form-item label="密码">
                    <el-input v-model="userForm.password" type="password" show-password />
                </el-form-item>
                <el-form-item label="系统角色">
                    <el-select v-model="userForm.role" style="width: 100%">
                        <el-option label="系统管理员" value="admin" />
                        <el-option label="一般用户" value="visitor" />
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
import http from '../../api/http';

const userList = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);

const currentRole = localStorage.getItem('role');
const currentUser = localStorage.getItem('username');
const isAdmin = computed(() => currentRole === 'admin');

const userForm = ref({ username: '', password: '', role: 'visitor' });

// 获取用户列表
const fetchUsers = async () => {
    if (!isAdmin.value) return; // 访客不请求列表，由前端隔离或展示空白
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

const openAddDialog = () => {
    userForm.value = { username: '', password: '', role: 'visitor' };
    dialogVisible.value = true;
};

// 提交新用户
const submitAddUser = async () => {
    if (!userForm.value.username || !userForm.value.password) {
        return ElMessage.warning('请填写完整信息');
    }
    try {
        await http.post('/api/users', userForm.value);
        ElMessage.success('用户创建成功');
        dialogVisible.value = false;
        fetchUsers();
    } catch (err) {
        console.error(err);
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

onMounted(() => {
    fetchUsers();
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
