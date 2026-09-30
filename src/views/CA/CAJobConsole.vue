<!-- views/CAJobConsole.vue -->
<template>
  <div class="job-console-container">
    <!-- 顶层控制面板卡片 -->
    <el-card class="control-panel-card" shadow="always">
      <template #header>
        <div class="card-header">
          <span>💨 气调作业实时控制台</span>
          <el-tag :type="statusTagType" effect="dark">{{ currentJob.status_text || '无激活任务' }}</el-tag>
        </div>
      </template>

      <el-form :inline="true" :model="controls" class="control-form">
        <!-- 1. 选择仓房 -->
        <el-form-item label="选择仓房">
          <el-select v-model="controls.house_code" placeholder="请选择仓房" style="width: 160px" :disabled="isJobActive">
            <!-- <el-option v-for="i in 5" :key="i" :label="`${i}号仓房`" :value="`GH-0${i}`" /> -->
            <el-option v-for="code in houseCodeList" :key="code" :label="code" :value="code" />
          </el-select>
        </el-form-item>

        <!-- 2. 选择气调模式（联动触发数据加载） -->
        <el-form-item label="气调模式">
          <el-select v-model="controls.mode_id" placeholder="请选择模式" style="width: 200px" :disabled="isJobActive"
            @change="handleModeChange">
            <el-option v-for="item in modeList" :key="item.id" :label="item.mode_name" :value="item.id" />
          </el-select>
        </el-form-item>

        <!-- 3. 计划开始时间 -->
        <el-form-item label="计划开始时间">
          <el-date-picker v-model="controls.plan_start_time" type="datetime" placeholder="留空则立刻启动" style="width: 200px"
            :disabled="isJobActive" />
        </el-form-item>

        <!-- 4. 核心按钮状态组 -->
        <el-form-item class="button-group">
          <!-- 启动按钮：无任务时显示“下发启动”，暂停时显示“恢复运行” -->
          <el-button type="success" icon="VideoPlay"
            :disabled="!controls.house_code || !controls.mode_id || currentJob.status_code === 1"
            @click="handleAction(currentJob.id ? 'start' : 'launch')">
            {{ currentJob.status_code === 2 ? '恢复运行' : '下发启动' }}
          </el-button>

          <!-- 暂停按钮：仅在运行中可用 -->
          <el-button type="warning" icon="VideoPause" :disabled="currentJob.status_code !== 1"
            @click="handleAction('pause')">
            暂停作业
          </el-button>

          <!-- 中止按钮：只要有激活任务，随时可以紧急中止并切断阀门 -->
          <el-button type="danger" icon="CircleClose"
            :disabled="!currentJob.id || [3, 4, 5].includes(currentJob.status_code)" @click="handleAction('stop')">
            紧急中止
          </el-button> <!-- 确保这个结束标签完整 -->

        </el-form-item>
      </el-form>
    </el-card>

    <!-- 下方参数回显面板：展示当前模式将被下发或正在运行的 40 个参数详情 -->
    <el-card class="details-panel-card" style="margin-top: 20px;" v-loading="paramLoading">
      <template #header>
        <div class="card-header"><span>📋 预载作业参数矩阵快照</span></div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="工艺预设参数" name="params">
          <el-descriptions :column="3" border class="param-descriptions">
            <el-descriptions-item v-for="(val, key) in filteredParams" :key="key" :label="paramLabelMap[key]">
              <el-tag size="small" type="info">{{ val }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="阀门初始开闭矩阵 (26个)" name="valves">
          <el-row :gutter="10">
            <el-col :span="4" v-for="i in 26" :key="i" style="margin-bottom: 10px;">
              <div class="valve-status-block" :class="{ 'is-open': loadedParams[`valve_${i}`] }">
                <span>阀门 #{{ i }}</span>
                <span class="status-dot"></span>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="风机矩阵 (6个)" name="blowers">
          <el-row :gutter="10">
            <el-col :span="4" v-for="i in 6" :key="i" style="margin-bottom: 10px;">
              <div class="valve-status-block" :class="{ 'is-open': loadedParams[`blower_${i}`] }">
                <span>阀门 #{{ i }}</span>
                <span class="status-dot"></span>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 1. 控制变量与表单
const modeList = ref([])
const houseCodeList = ref([])
const activeTab = ref('params')
const paramLoading = ref(false)

const controls = reactive({
  house_code: '',
  mode_id: null,
  plan_start_time: null
})

// 当前激活的作业状态机信息
const currentJob = reactive({
  id: null,
  status_code: null, // 0-等待, 1-运行, 2-暂停, 3-结束, 4-中止
  status_text: ''
})

// 动态从后端加载到的单套模式参数大对象（40个字段）
const loadedParams = ref({})

// 2. 状态标签颜色转换器
const statusTagType = computed(() => {
  const map = { 0: 'info', 1: 'success', 2: 'warning', 4: 'danger', 5: 'danger' }
  return map[currentJob.status_code] || 'info'
})

// 判断当前作业是否为激活态（锁定选择框）
const isJobActive = computed(() => [0, 1, 2].includes(currentJob.status_code))

// 过滤掉26个阀门和元数据，只把13个核心工艺参数提取给表单渲染
const filteredParams = computed(() => {
  const result = { ...loadedParams.value }
  Object.keys(result).forEach(key => {
    if (key.startsWith('valve_')  || key.startsWith('blower_') || ['id', 'mode_name', 'create_time', 'update_time'].includes(key)) {
      delete result[key]
    }
  })
  return result
})

// 3. 核心字段的中文映射表 (对应你给出的参数名称)
const paramLabelMap = {
  target_warehouse_pressure: '目标仓压值',
  nitrogen_fill_amount: '充氮量值',
  exhaust_time: '排气时间',
  waste_nitrogen_concentration: '废氮浓度值',
  evacuation_negative_pressure: '抽空负压值',
  target_concentration: '目标浓度值',
  auto_concentration_hold: '自动浓度保持值',
  ab_group_concentration_diff: 'AB组浓度差',
  waste_nitrogen_utilization_interval: '废氮利用间隔',
  maintain_negative_pressure: '维持负压值',
  pause_warehouse_pressure: '暂停仓压值',
  circulation_time: '环流时间',
  evacuation_pressure: '抽空压力值'
}

// 4. 事件逻辑：选择模式后触发拉取 40 个字段详情
const handleModeChange = async (modeId) => {
  if (!modeId) return
  paramLoading.value = true
  try {
    // 💡 请求你在上一步编写的获取单条配置的接口（这里用列表过滤模拟，实际开发建议写 get_by_id）
    const res = await axios.get('http-api/api/ca/configs')
    const match = res.data.find(item => item.id === modeId)
    if (match) {
      loadedParams.value = match
      ElMessage.success(`成功加载 "${match.mode_name}" 的配置快照`)
    }
  } catch (error) {
    ElMessage.error('加载模式参数矩阵失败')
  } finally {
    paramLoading.value = false
  }
}

// 5. 核心逻辑：按钮状态机分发控制（启动、暂停、中止、创建）
const handleAction = async (actionType) => {
  try {
    if (actionType === 'launch') {
      // 🚀 初次下发
      const submitData = {
        house_code: controls.house_code,
        mode_id: controls.mode_id,
        plan_start_time: controls.plan_start_time,
        runtime_params: loadedParams.value // 40个字段一并打包作为快照发给后端
      }
      const res = await axios.post('http-api/api/ca/jobs/launch', submitData)
      currentJob.id = res.data.job_id
      currentJob.status_code = controls.plan_start_time ? 0 : 1
      currentJob.status_text = controls.plan_start_time ? '等待触发' : '运行中'
      ElMessage.success(res.data.message)
    } else {
      // 🚀 后续状态控制 (start, pause, stop)
      if (actionType === 'stop') {
        await ElMessageBox.confirm('⚠️ 警告：紧急中止将立即关闭所有供气阀门，确认执行安全切断吗？', '紧急操作提示', { type: 'error' })
      }
      const res = await axios.post(`http-api/api/ca/jobs/${currentJob.id}/control?action=${actionType}`)
      currentJob.status_text = res.data.current_status

      // 前端本地状态状态机对齐
      if (actionType === 'start') currentJob.status_code = 1
      if (actionType === 'pause') currentJob.status_code = 2
      if (actionType === 'stop') {
        currentJob.status_code = 4
        // 延迟清空，允许用户查看当前状态
        setTimeout(() => {
          currentJob.id = null
          currentJob.status_code = null
          currentJob.status_text = ''
        }, 3000)
      }
      ElMessage({ type: actionType === 'stop' ? 'error' : 'success', message: `指令【${actionType}】执行成功` })
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.response?.data?.detail || '状态机指令下发失败')
  }
}

// 初始化加载基础模式列表
onMounted(async () => {
  // try {
  //   const res = await axios.get('http-api/api/ca/configs')
  //   modeList.value = res.data
  // } catch {
  //   ElMessage.error('初始化模式列表失败')
  // }

  try {
    const [configsFuture, houseFuture] = await Promise.all([
      // fetchRunningJobs(selectedHouseCode.value),
      axios.get('http-api/api/ca/configs'),
      axios.get('http-api/api/houses/codes')
    ])

    // 统一赋值
    houseCodeList.value = houseFuture.data
    modeList.value = configsFuture.data
    console.log('✅ 所有数据加载完毕！')
  } catch (error) {
    console.error('其中一个请求失败了：', error)
  }


})
</script>

<style scoped>
.job-console-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.control-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.button-group {
  margin-left: 20px;
}

.valve-status-block {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f7fa;
  transition: all 0.3s;
  font-size: 13px;
}

.valve-status-block .status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #909399;
}

/* 阀门开启时的动态高亮样式 */
.valve-status-block.is-open {
  background-color: #e1f3d8;
  border-color: #67c23a;
  color: #529b2e;
  font-weight: bold;
}

.valve-status-block.is-open .status-dot {
  background-color: #67c23a;
  box-shadow: 0 0 6px #67c23a;
}
</style>
