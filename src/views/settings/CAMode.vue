<template>
  <div class="app-container">
    <!-- 功能操作区 -->
    <!-- ✅ 修正后 -->
    <div class="filter-container" style="margin-bottom: 20px;">
      <el-button type="primary" icon="Plus" @click="handleCreate">新增气调配置</el-button>
    </div>


    <!-- 数据表格 -->
    <el-table :data="list" border style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="mode_name" label="模式名称" width="150" fixed />
      <el-table-column prop="target_concentration" label="目标浓度" width="100" />
      <el-table-column prop="target_warehouse_pressure" label="目标仓压" width="100" />
      <el-table-column prop="nitrogen_fill_amount" label="充氮量" width="100" />
      <el-table-column prop="create_time" label="创建时间" width="180" />
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗：新增/编辑 (包含40个字段的分栏表单) -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="75%" top="5vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-tabs v-model="activeTab">

          <!-- 标签页 1：核心工艺参数 -->
          <el-tab-pane label="工艺参数" name="params">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="模式名称" prop="mode_name">
                  <el-input v-model="form.mode_name" placeholder="请输入模式名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="目标浓度值" prop="target_concentration">
                  <el-input-number v-model="form.target_concentration" :precision="2" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="目标仓压值" prop="target_warehouse_pressure">
                  <el-input-number v-model="form.target_warehouse_pressure" :precision="2" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="充氮量值" prop="nitrogen_fill_amount">
                  <el-input-number v-model="form.nitrogen_fill_amount" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="排气时间(s)" prop="exhaust_time">
                  <el-input-number v-model="form.exhaust_time" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="废氮浓度值" prop="waste_nitrogen_concentration">
                  <el-input-number v-model="form.waste_nitrogen_concentration" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="抽空负压值" prop="evacuation_negative_pressure">
                  <el-input-number v-model="form.evacuation_negative_pressure" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="自动浓度保持" prop="auto_concentration_hold">
                  <el-input-number v-model="form.auto_concentration_hold" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="AB组浓度差" prop="ab_group_concentration_diff">
                  <el-input-number v-model="form.ab_group_concentration_diff" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="废氮利用间隔(m)" prop="waste_nitrogen_utilization_interval">
                  <el-input-number v-model="form.waste_nitrogen_utilization_interval" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="维持负压值" prop="maintain_negative_pressure">
                  <el-input-number v-model="form.maintain_negative_pressure" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="暂停仓压值" prop="pause_warehouse_pressure">
                  <el-input-number v-model="form.pause_warehouse_pressure" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="环流时间(s)" prop="circulation_time">
                  <el-input-number v-model="form.circulation_time" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="抽空压力值" prop="evacuation_pressure">
                  <el-input-number v-model="form.evacuation_pressure" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 标签页 2：26个阀门状态管理 (使用 Grid 矩阵式排列) -->
          <el-tab-pane label="阀门矩阵配置" name="valves">
            <el-row :gutter="20">
              <el-col :span="6" v-for="i in 26" :key="i" style="margin-bottom: 15px;">
                <el-card shadow="hover"
                  body-style="padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 14px; font-weight: bold;">阀门 #{{ i }}</span>
                  <el-switch v-model="form[`valve_${i}`]" active-text="开启" inactive-text="关闭" inline-prompt />
                </el-card>
              </el-col>
            </el-row>
          </el-tab-pane>

        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="submitForm">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElTabs, ElTabPane, ElInputNumber } from 'element-plus'
import axios from 'axios'

// 基础变量
const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增配置')
const activeTab = ref('params')
const formRef = ref(null)

// 初始化一个干净的 40 字段表单对象
const createEmptyForm = () => {
  const baseForm = {
    id: null,
    mode_name: '',
    target_warehouse_pressure: 0,
    nitrogen_fill_amount: 0,
    exhaust_time: 0,
    waste_nitrogen_concentration: 0,
    evacuation_negative_pressure: 0,
    target_concentration: 0,
    auto_concentration_hold: 0,
    ab_group_concentration_diff: 0,
    waste_nitrogen_utilization_interval: 0,
    maintain_negative_pressure: 0,
    pause_warehouse_pressure: 0,
    circulation_time: 0,
    evacuation_pressure: 0,
  }
  // 动态挂载 26 个阀门的默认关闭状态
  for (let i = 1; i <= 26; i++) {
    baseForm[`valve_${i}`] = false
  }
  return baseForm
}

const form = reactive(createEmptyForm())

const rules = {
  mode_name: [{ required: true, message: '请输入模式名称', trigger: 'blur' }]
}

// --- 增删改查逻辑 ---

// 查 (获取列表)
const fetchList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/ca/configs')
    list.value = res.data
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 增
const handleCreate = () => {
  dialogTitle.value = '新增气调配置'
  Object.assign(form, createEmptyForm()) // 重置表单
  dialogVisible.value = true
  activeTab.value = 'params'
}

// 改 (回显数据)
const handleUpdate = (row) => {
  dialogTitle.value = '编辑气调配置'
  Object.assign(form, row) // 将当前行数据深拷贝/赋值到响应式表单中
  dialogVisible.value = true
  activeTab.value = 'params'
}

// 提交表单 (新增或修改)
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (form.id) {
        // 更新
        await axios.put(`/api/v1/ca/configs/${form.id}`, form)
        ElMessage.success('更新成功')
      } else {
        // 创建
        await axios.post('/api/v1/ca/configs', form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } catch (error) {
      ElMessage.error('操作失败')
    }
  })
}

// 删
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除模式 "${row.mode_name}" 吗？`, '警告', {
    type: 'warning'
  }).then(async () => {
    await axios.delete(`/api/v1/ca/configs/${row.id}`)
    ElMessage.success('删除成功')
    fetchList()
  }).catch(() => { })
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>
