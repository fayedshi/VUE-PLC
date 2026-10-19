<template>
  <div class="user-list-container">
    <el-card header="粮库职工账户管理">
      <!-- 职工数据表格 -->
      <el-table :data="userTableData" style="width: 100%" border>
        <el-table-column prop="id" label="工号/ID" width="100" />
        <el-table-column prop="username" label="用户名/账号" width="180" />
        <el-table-column prop="role_name" label="系统角色" width="180">
          <template #default="scope">
            <el-tag :type="scope.row.role_name === '管理员' ? 'danger' : 'success'">
              {{ scope.row.role_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录时间" />
        
        <!-- 操作栏 -->
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <!-- 如果是普通保管员，允许重置 -->
            <el-button 
              type="danger" 
              size="small" 
              plain
              @click="handleResetPassword(scope.row)"
            >
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 模拟表格里的库区职工数据
const userTableData = ref([
  { id: 1, username: 'admin_01', role_name: '管理员', last_login: '2026-10-18' },
  { id: 2, username: 'store_keeper', role_name: '粮库保管员', last_login: '2026-10-19' },
  { id: 3, username: 'inspector_li', role_name: '质检化验员', last_login: '2026-10-15' }
])

// 触发重置密码点击事件
const handleResetPassword = (row) => {
  ElMessageBox.confirm(
    `确定要重置保管员 [ ${row.username} ] 的登录密码吗？`,
    '安全警告',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  .then(async () => {
    try {
      // 发起后端请求，传入该用户的 ID
      const response = await axios.post(`/api/v1/admin/users/${row.id}/reset-password`)
      
      const initialPassword = response.data.data.initial_password
      
      // 成功弹窗，并提供一键复制初始密码的提示
      ElMessageBox.alert(
        `该职工密码已重置成功！<br/>初始随机密码为：<b style="color: #f56c6c; font-size: 16px;">${initialPassword}</b><br/><br/>请将此密码告知该职工，其下次登录时系统将强制要求其修改密码。`,
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
  })
  .catch(() => {
    ElMessage.info('已取消重置操作')
  })
}
</script>

<style scoped>
.user-list-container {
  padding: 20px;
}
</style>
