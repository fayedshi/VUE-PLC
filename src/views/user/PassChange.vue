<template>
  <div class="password-container">
    <el-card class="password-card" header="修改个人密码">
      <el-alert title="安全提示：请定期更换粮库系统密码。新密码长度至少8位，且需同时包含大小写字母、数字和特殊符号。" type="warning" show-icon :closable="false"
        style="margin-bottom: 20px" />

      <el-form ref="passwordFormRef" :model="form" :rules="rules" label-width="100px" label-position="right">
        <!-- 旧密码 -->
        <el-form-item label="当前旧密码" prop="old_password">
          <el-input v-model="form.old_password" type="password" show-password placeholder="请输入您当前的登录密码" />
        </el-form-item>

        <!-- 新密码 -->
        <el-form-item label="设置新密码" prop="new_password">
          <el-input v-model="form.new_password" type="password" show-password placeholder="请设置新的强密码" />
        </el-form-item>

        <!-- 确认新密码 -->
        <el-form-item label="确认新密码" prop="confirm_password">
          <el-input v-model="form.confirm_password" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确认修改
          </el-button>
          <el-button @click="handleReset">重置表单</el-button>
          <el-button @click="cancelReset">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios' // 假设使用 axios 进行通信
import http from '../../../api/http'
// import myRouter from '../../router/myindex'
import { useRouter } from 'vue-router';

const router = useRouter();
const passwordFormRef = ref(null)
const submitLoading = ref(false)

// 表单数据
const form = reactive({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

// 自定义验证：二次密码一致性判定
const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== form.new_password) {
    callback(new Error('两次输入的新密码不一致，请检查！'))
  } else {
    callback()
  }
}

// 满足网络安全等级保护（等保）的密码正则校验
const validatePasswordStrength = (rule, value, callback) => {
  const reg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (value === '') {
    callback(new Error('请输入新密码'))
  } else if (!reg.test(value)) {
    callback(new Error('密码太弱！必须包含大小写字母、数字及特殊字符，且不低于8位'))
  } else {
    callback()
  }
}

// 表单前端校验规则
const rules = {
  old_password: [
    { required: true, message: '请输入当前旧密码', trigger: 'blur' }
  ],
  new_password: [
    { required: true, validator: validatePasswordStrength, trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 提交表单
const handleSubmit = () => {
  if (!passwordFormRef.value) return

  passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        // 调用后端 FastAPI 接口
        const response = await http.post('/api/auth/password/update', form)

        ElMessageBox.alert(response.data.message || '修改成功', '操作成功', {
          confirmButtonText: '重新登录', callback: () => {
            // 这里清除本地 Token (例如 localStorage.clear())
            // 并通过路由跳转重定向回登录页
            localStorage.clear()
            router.push('/login')
            console.log('清除Token，跳转至登录页')
          }
        })
      } catch (error) {
        // 捕获后端返回的错误信息（如：旧密码不正确）
        const errorMsg = error.response?.data?.detail || '修改密码失败，请联系库区网管'
        ElMessage.error(errorMsg)
      } finally {
        submitLoading.value = false
      }
    } else {
      ElMessage.warning('请根据红字提示修正输入项')
      return false
    }
  })
}

// 重置表单
const handleReset = () => {
  if (passwordFormRef.value) {
    passwordFormRef.value.resetFields()
  }
}

const cancelReset = () => {
  router.back()

}


</script>

<style scoped>
.password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background-color: #f5f7fa;
  min-height: 80vh;
}

.password-card {
  width: 100%;
  max-width: 550px;
}
</style>
