<template>
  <div class="control-panel">
    <!-- <h1 class="panel-title">智能通风作业控制面板</h1> -->

    <!-- 1. 模式选择区域 -->
    <div class="section mode-section">

      <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />



      <label class="section-label">选择通风模式：</label>
      <select v-model="selectedMode" class="native-select" @change="handleModeChange">
        <option v-for="mode in modeList" :key="mode.id" :value="mode.id">
          {{ mode.name }}
        </option>
      </select>


    </div>

    <!-- 2. 条件设置区域（并排显示） -->
    <div class="condition-container">
      <!-- 开始条件（横排） -->
      <!-- <div class="condition-box flex-column">
        <div class="box-title start-title">作业开始条件</div>
        <div class="form-inline-row">
          <div class="form-group-inline">
            <label>粮堆层级</label>
            <select v-model="startCondition.level" ref="layerSelRef" id="layerSel" @change="handleSelChange($event)"
              class="native-select">
              <option value=0>整仓</option>
              <option value=1>表层</option>
              <option value=2>中上层</option>
              <option value=3>中下层</option>
              <option value=4>下层</option>
            </select>
          </div>

          <div class="form-group-inline">
            <label>指标列表</label>
            <select v-model="startCondition.metric" ref="metricSelRef" id="metricSel" @change="handleSelChange($event)"
              class="native-select">
              <option value="maxTemp">最大温度</option>
              <option value="minTemp">最小温度</option>
              <option value="avgTemp">平均温度</option>
            </select>
          </div>

          

          <div class="form-group-inline">
            <label>操作符</label>
            <select v-model="startCondition.operator" class="native-select font-mono">
              <option value=0>&gt;=</option>
              <option value=1>&lt;=</option>
            </select>
          </div>

          
          <div class="form-group-inline">
            <label>阈值设定</label>
            <div class="input-unit-wrapper">
              <input v-model.number="startCondition.threshold" type="number" step="0.1" required placeholder="0.0"
                class="native-input condition-value-input" />
              <span class="inline-unit">°C</span>
            </div>
          </div>
        </div>
      </div> -->

      <!-- 2. 动态嵌入对应的触发条件组件 -->
      <div class="condition-container">
        <!-- 如果未注册该组件，展示友好提示 -->
        <component v-if="currentConditionComponent" :is="currentConditionComponent" v-model:start="parentStart"
          v-model:end="parentEnd" />
        <!-- <component v-if="currentConditionComponent" :is="currentConditionComponent"  @init-model="handleInitValue"/> -->
        <!-- <div  v-else class="empty-tip">
          ⚠️ 该通风模式的触发条件组件尚未开发或注册。
        </div> -->
      </div>


      <!-- 结束条件（动态同步与取反，同样横排） -->
      <!-- <div class="condition-box disabled-box flex-column">

        <div class="box-title end-title">作业结束条件</div>
        <div class="form-inline-row">
          <div class="form-group-inline">
            <label>粮堆层级</label>
            <div class="sync-value">{{ layerText }}</div>
          </div>
          <div class="form-group-inline">
            <label>指标列表</label>
            <div class="sync-value">{{ metricText }}</div>
          </div>

          <div class="form-group-inline">
            <label>操作符</label>
            <div class="sync-value font-mono font-bold text-red">
              {{ startCondition.operator == 0 ? '<' : '>' }} </div>
            </div>

            <div class="form-group-inline">
              <label>联动阈值</label>
              <div class="sync-value">
                {{ startCondition.threshold }} <span class="ml-1 font-normal text-muted">°C</span>
              </div>
            </div>
          </div>
        </div> -->

    </div>
  </div>


  <!-- 3. 设备选择区域 -->
  <div class="section device-section">
    <!-- <div class="section-title">设备选择控制</div> -->

    <!-- 通风窗 (10个) -->
    <!-- 通风窗 -->
    <div class="device-row" v-if="windowsLen">
      <span class="device-label">通风窗：</span>
      <div class="device-list">
        <el-checkbox-group v-model="devices.windows">
          <el-checkbox v-for="i in windowsLen" :key="'window-' + i" :value="i">
            窗#{{ i }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <!-- 风门 -->
    <div class="device-row" v-if="dampersLen">
      <span class="device-label">风门：</span>
      <div class="device-list">
        <el-checkbox-group v-model="devices.dampers">
          <el-checkbox v-for="i in dampersLen" :key="'damper-' + i" :value="i">
            门#{{ i }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <!-- 风机 (正/反单选，支持取消选中) -->
    <div class="device-row" v-if="blowersLen">
      <span class="device-label">风机：</span>
      <div class="device-list inline-grid">
        <div v-for="i in blowersLen" :key="'blower-' + i" class="blower-group">
          <span class="blower-name">风机#{{ i }}:</span>
          <!-- 注意：这里不绑定 v-model，而是通过 :model-value 配合自定义点击事件来实现“可取消选中” -->
          <el-radio-group :model-value="devices.blowers[i]">
            <el-radio :value="1" @click.prevent="toggleBlower(i, 1)">正</el-radio>
            <el-radio :value="2" @click.prevent="toggleBlower(i, 2)">反</el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 排风扇 -->
    <div class="device-row" v-if="exhaustFansLen">
      <span class="device-label">排风扇：</span>
      <div class="device-list">
        <el-checkbox-group v-model="devices.exhaustFans">
          <el-checkbox v-for="i in exhaustFansLen" :key="'fan-' + i" :value="i">
            扇#{{ i }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <!-- 空调 -->
    <div class="device-row" v-if="airConditionersLen">
      <span class="device-label">空调：</span>
      <div class="device-list">
        <el-checkbox-group v-model="devices.airConditioners">
          <el-checkbox v-for="i in airConditionersLen" :key="'ac-' + i" :value="i">
            空调#{{ i }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>




    <!-- 4. 运行时长设置区域 -->
    <div class="section duration-section">
      <div class="duration-wrapper">
        <!-- 勾选框与文字标签合二为一，更加语义化 -->
        <el-checkbox v-model="durationControl.enabled" @change="handleDurationChange" class="duration-checkbox">
          <span class="duration-label">运行最大时长限制：</span>
        </el-checkbox>

        <div class="input-group">
          <!-- 使用 el-input-number，自带步进器和数值限制 -->
          <el-input-number v-model="durationControl.mins" :disabled="!durationControl.enabled" :min="1"
            :controls="false" placeholder="30" class="duration-input" @input="validateDuration">
            <!-- 通过 append 插槽将“分钟”单位完美嵌入输入框内部 -->
            <!-- <template #append>分钟</template> -->
          </el-input-number>

          <!-- 提示文字，仅在未勾选时显示 -->
          <span v-if="!durationControl.enabled" class="unit-tip">
            默认最长执行 {{ durationControl.mins }} 分钟，勾选后可修改最大时长
          </span>
        </div>
      </div>
    </div>
    <!--当前运行中的作业  -->
    <span>运行中的作业：
      <span v-if=!activeJob?.id>无</span></span>
    <div v-if="activeJob?.id" class="table-wrapper">
      <table class="native-table">
        <thead>
          <tr>
            <th>作业ID</th>
            <th>模式</th>
            <th>仓房名称</th>
            <th>作业状态</th>
            <!-- <th>异常详情</th> -->
            <th>开启时间</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ activeJob?.id }}</td>
            <td>{{ activeJob?.mode_name ? activeJob?.mode_name : '无' }}</td>
            <td>{{ activeJob?.house_code }}</td>
            <td>{{ activeJob?.status_text }}</td>
            <td>{{ activeJob?.create_time }}</td>
            <td>{{ activeJob?.update_time }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5. 底部控制按钮 -->
    <div class="action-bar">
      <button class="btn btn-success" @click="startJob('sched')">开始智能作业</button>
      <button class="btn btn-adhoc" @click="startJob('adhoc')">开始即时作业</button>
      <button class="btn btn-danger" @click="handleStopJob">停止作业</button>
      <!-- <button class="btn btn-primary" @click="handleSaveMode">保存模式</button> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import axios from 'axios';
import HouseSelect from '../../components/HouseSelect.vue'
import http from '../../../api/http';
const layerText = ref('')
const metricText = ref('')
const layerSelRef = ref(null)
const metricSelRef = ref(null)

const activeJob = ref({})

const handleSelChange = (event) => {
  // event.target.selectedOptions[0] 即可拿到当前选中的 option 标签对象
  const selectId = event.target.id
  console.log(event)
  const selText = event.target.selectedOptions[0].text
  if (selectId == 'layerSel') {
    layerText.value = selText
  } else if (selectId == 'metricSel') {
    metricText.value = selText
  }
  console.log('当前文本：', layerText.value)
}

const handleDurationChange = () => {
  if (!durationControl.enabled) {
    console.log('用户取消了勾选');
    durationControl.mins = 60
  }
};

const handleHouseChange = async () => {
  console.log('house ', selectedHouseCode.value)
  if (!selectedHouseCode.value) {
    return
  }
  await Promise.all([
    fetchRunningJobs(selectedHouseCode.value),
    loadGranConfig()
    // axios.get('http-api/api/houses/codes')
  ])
  // console.log(`切换至模式: ${selectedMode.value}`)
  initDevices()
}

import SummerInternalCirculation from '../../components/SummerInternalCirculation.vue';
// import ConditionWholeSilo from '../../components/ConditionWholeSilo.vue'
import ConditionUpperSilo from '../../components/ConditionUpperSilo.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 当前选中的模式
const selectedMode = ref(0)

// 核心：模式与组件的映射表 (使用 shallowRef 优化组件对象性能)
const componentMap = {
  0: null,
  1: ConditionUpperSilo,
  2: SummerInternalCirculation,
}

const strategyConfig = ref({
  0: {},
  HEAT_ACCUMULATION: {},
  WHOLE_SILO_COOLING: {},
  MOISTURE_KEEPING: {}
})



const parentStart = ref();
const parentEnd = ref();

// 计算属性：动态获取当前应该挂载的组件
const currentConditionComponent = computed(() => {
  return componentMap[selectedMode.value] || null
})

// 切换模式时的钩子
const handleModeChange = () => {
  console.log(`切换至模式: ${selectedMode.value}`)
}


onMounted(async () => {
  // layerText.value=startCondition.level
  // layerText.value = layerSelRef.value.selectedOptions[0].text
  // metricText.value = metricSelRef.value.selectedOptions[0].text

  // await fetchRunningJobs(houseCode)
  console.log('onMounted active job:', activeJob.value)
  if (!selectedHouseCode.value) {
    return
  }
  try {
    await Promise.all([
      fetchRunningJobs(selectedHouseCode.value),
      loadGranConfig()
      // axios.get('http-api/api/houses/codes')
    ])
    initDevices()



    // 统一赋值
    // houseCodeList.value = houseFuture.data
    console.log('✅ 所有数据加载完毕！')
  } catch (error) {
    console.error('其中一个请求失败了：', error)
  }
})

const fetchRunningJobs = (async (houseCode) => {
  try {
    //todo: device address hardcoded, will modify later
    let jobs = await http.get(`/api/venti/jobs/${houseCode}`);
    if (jobs) {
      activeJob.value = jobs.data[0]
    }
    console.log('in fetchRunningJobs jobs,', jobs.data)
    // console.log('result ', result)
  } catch (err) {
    // alert('操作失败，请检查PLC连接');
  } finally {
    console.log('jobs fetched')
  }
})

const modeList = ref([
  { id: 0, name: '' },
  { id: 1, name: '❄️ 降低表层粮温' },
  { id: 2, name: '🔥 夏季内循环' },
  // { id: 3, name: '❄️ 冬季外循环' }
  // { id: 2, name: '🔥 仓顶排积热通风' },
  // { id: 3, name: '❄️ 降低整仓粮温通风' }
]);

// const houseCodeList = ref([])

const selectedHouseCode = ref('');
const granConfig = ref({})

// 设备选择响应式数据
const devices = reactive({
  windows: [] as number[],
  dampers: [] as number[],
  exhaustFans: [] as number[],
  airConditioners: [] as number[],
  // 8个风机，用 Record<键, 值> 存储。值可以是 '正' | '反' | null
  blowers: reactive<Record<number, 1 | 2 | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null
  })
});

let windowsLen = ref(0)
let dampersLen = ref(0)
let exhaustFansLen = ref(0)
let airConditionersLen = ref(0)
let blowersLen = ref(0)


const initDevices = () => {
  devices.windows = [];
  devices.dampers = [];
  devices.exhaustFans = [];
  devices.airConditioners = [];

  windowsLen.value = getDevLen('windows');
  dampersLen.value = getDevLen('dampers')
  blowersLen.value = getDevLen('blowers')
  exhaustFansLen.value = getDevLen('exhaustFans')
  airConditionersLen.value = getDevLen('airConditionersLen')

  // 重置风机状态
  Object.keys(devices.blowers).forEach(key => {
    devices.blowers[Number(key)] = null;
  });
}

const loadGranConfig = async () => {
  // loading.value = true
  console.log('in fetchGranaryList')
  try {
    // 💡 动态将前端的输入框内容拼接到 URL 的参数中 (Query Parameters)
    const response = await http.get(`/api/dev-address/${selectedHouseCode.value}`)
    console.log('fetched gran config:', response)
    // 将后端返回的 MySQL 字典列表直接赋给组件变量
    granConfig.value = response.data
  } catch (error) {
    // console.error('❌ 请求后端接口失败:', error)
    // alert('数据加载失败，请检查后端服务是否启动！')
  } finally {

  }
}

const getDevLen = (devCate) => {
  let start = granConfig.value?.[devCate]?.[0]
  console.log('start: ', start)
  if (!start) {
    console.log('returning 0')
    return 0
  }
  let end = granConfig.value?.[devCate][1]
  console.log('dev len: ', end - start + 1)
  return end - start + 1
}

// 运行时长控制
const durationControl = reactive({
  enabled: false,
  mins: 60
});

// 模式切换联动处理
// const handleModeChange = () => {
//   if (selectedModeId.value) {
//     const currentMode = modeList.value.find(m => m.id === selectedModeId.value);
//     if (currentMode) {
//       console.log(`已联动切换至模式: ${currentMode.name}`);
//       // 业务扩展点：这里可以根据选中的模式从后端获取关联的默认设备或条件设置
//     }
//   }
// };

// 风机正反单选框逻辑：点击已选中的则“取消选中”
const toggleBlower = (index: number, direction: 1 | 2) => {
  if (devices.blowers[index] === direction) {
    devices.blowers[index] = null; // 取消选中
  } else {
    devices.blowers[index] = direction; // 切换或选中
  }
};

// 限制运行时间只能输入正整数
const validateDuration = () => {
  if (typeof durationControl.mins === 'number') {
    durationControl.mins = Math.max(1, Math.floor(durationControl.mins));
  }
  else {
    durationControl.mins = 60;
  }
};

let isStartJobClicked = ref(false)
let isStopJobClicked = ref(false)


const startJob = async (jobType: string) => {

  // console.log(selectedHouseCode.value)

  let payload = {
    house_code: selectedHouseCode.value,
    devices: devices,
    mode_id: selectedMode.value,
    mode_name: modeList.value[selectedMode.value].name,
    duration: durationControl.mins * 60
  }
  let apiUrl = null
  if (jobType == 'adhoc') {
    if (selectedMode.value > 0) {
      ElMessage.warning('请取消选择通风模式')
      return
    }
    // apiUrl = '/api/venti/adhoc/start'
  } else {
    if (selectedMode.value == 0) {
      ElMessage.error('请选择通风模式')
      return
    }

    // apiUrl = '/api/venti/sched/start'
    payload.start_condition = parentStart.value ?? '';
    payload.end_condition = parentEnd.value ?? '';
  }
  await ElMessageBox.confirm(
    `确定开始仓房 ${selectedHouseCode.value}的作业吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  try {
    //todo: device address hardcoded, will modify later
    apiUrl = `/api/venti/${jobType}/start`
    const result = await http.post(apiUrl,
      payload
    );
    console.log('payload: ', payload)
    if (result.data.status != 'busy') {
      setTimeout(async () => {
        // console.log("这行会在 3 秒后才打印");
        await fetchRunningJobs('001')
        console.log('handleAdhocJob active job,', activeJob.value)
      }, 1000);
    }
    console.log('job started')
    console.log('result ', result)
    alert(result.data.message)
  } catch (err) {
    // alert('操作失败，请检查 PLC 连接');
  }
}

// 2. 停止作业
const handleStopJob = async () => {
  const isConfirmed = confirm(`🚨 确定要停止仓房${selectedHouseCode.value}的当前通风作业吗？`);

  if (isConfirmed) {
    // alert("系统指令已下发：通风作业启动中...");
    // TODO: 调用后端异步开始接口
    // isStopJobClicked.value = true
    try {
      //todo: device address hardcoded, will modify later
      const result = await http.post("/api/venti/job/stop", {
        house_code: selectedHouseCode.value,
        devices: devices,
      });
      console.log('clicked stoped job')
      alert(result.data.message)
      await fetchRunningJobs(selectedHouseCode.value)
    } catch (err) {
      alert('操作失败，err: ' + err);
    } finally {
      console.log('finished handleStopJob')
    }
  }

};


// 3. 保存模式
// const handleSaveMode = () => {
//   if (selectedMode.value !== null) {
//     // 当前选中了某个现有模式
//     const currentMode = modeList.value.find(m => m.id === selectedModeId.value);
//     const isConfirmed = confirm(`检测到您当前选中了模式【${currentMode?.name}】。\n是否要【覆盖】该模式的现有配置？`);
//     if (isConfirmed) {
//       alert(`已成功更新并覆盖模式：${currentMode?.name}`);
//       // TODO: 调用后端覆盖保存的 PATCH 接口
//     }
//   } else {
//     // 未选择模式，属于直接保存为新配置
//     alert("当前未选择任何基础模式，已将当前配置保存为全局通用通风策略。");
//     // TODO: 调用后端普通保存 POST 接口
//   }
// };

</script>


<style scoped>
.control-panel {
  /* padding: 10px; */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
  /* width: 1000px; */
  margin: 0 auto;
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.panel-title {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 22px;
  color: #1e293b;
  text-align: center;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 12px;
}

/* 模块通用样式 */
.section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16px;
  border-left: 4px solid #3b82f6;
  padding-left: 8px;
}

/* 1. 模式选择样式 */
.mode-section {
  display: flex;
  align-items: center;
}

.section-label {
  margin-left: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.native-select {
  padding: 8px 12px;
  width: 200px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  background-color: #fff;
  outline: none;
  cursor: pointer;
  margin-right: 20px;
}

.native-select:focus {
  border-color: #3b82f6;
}

.mode-select {
  width: 360px;
  margin-right: 10px;
}

/* 2. 条件设置区域（左右并排） */
/* 让整个条件区域支持从上下两栏左右布局切换 */
.condition-container {
  display: flex;
  flex-direction: column;
  /* 改为垂直堆叠两组条件，以便让各自组内部拥有充足的横排宽度 */
  gap: 16px;

  margin-bottom: 20px;
}

/* 强制组内部转为纵向柔性布局 */
.flex-column {
  display: flex;
  flex-direction: column;
}

/* 核心横排流动行 */
.form-inline-row {
  display: flex;
  flex-wrap: wrap;
  /* 空间不足时自动换行，防错位 */
  gap: 0px;
  align-items: flex-end;
  /* 让下拉框和输入框对齐基准线 */
}

/* 横排下的单个表单单元 */
.form-group-inline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  /* min-width: 120px; */
  /* 保证每个框在小屏幕下也有基础宽度 */
}

.form-group-inline label {
  width: fit-content;
}

/* 针对操作符和数字输入框做更窄的适配，使其紧凑 */
.form-group-inline:nth-child(4) {
  flex: 0 0 80px;
  min-width: 80px;
}

.form-group-inline:nth-child(5) {
  flex: 0 0 130px;
  min-width: 130px;
}

.form-group-inline label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

/* 输入框与单位的紧凑外壳 */
.input-unit-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

/* 单独微调横排区域的输入框宽度 */
.condition-value-input {
  width: 100% !important;
  box-sizing: border-box;
  padding-right: 30px !important;
  /* 留出右侧空间放单位 */
  text-align: left !important;
  margin: 0 !important;
  height: 34px;
}

/* 输入框内嵌单位定位 */
.inline-unit {
  position: absolute;
  right: 10px;
  font-size: 13px;
  color: #94a3b8;
  pointer-events: none;
  /* 穿透点击事件 */
}

/* 去掉数字输入框的侧边微调箭头 */
.condition-value-input::-webkit-outer-spin-button,
.condition-value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.condition-value-input[type=number] {
  -moz-appearance: textfield;
}

.ml-1 {
  margin-left: 4px;
}

.font-normal {
  font-weight: normal;
}


.device-row {
  display: flex;
  align-items: flex-start;
  /* 改为 flex-start，防止组件多行时布局错乱 */
  padding: 16px 8px;
  /* 适当增加内边距，呼吸感更强 */
  border-bottom: 1px solid #f1f5f9;
  /* 虚线改实线，颜色极淡，减少视觉噪音 */
  transition: background-color 0.2s ease;
  /* 增加鼠标悬浮过渡 */
}

/* 鼠标悬浮整行时，背景微微变亮，增加交互感 */
.device-row:hover {
  background-color: #f8fafc;
}

/* 左侧标签美化 */
.device-label {
  width: 90px;
  /* 固定宽度，让所有设备名的冒号完美对齐 */
  flex-shrink: 0;
  /* 防止标签被压缩 */
  font-size: 14px;
  font-weight: 600;
  /* 加粗文字 */
  color: #334155;
  /* 深灰蓝色，比纯黑更高级 */
  line-height: 32px;
  /* 让文字高度与 Element Plus 组件（默认32px）完美居中对齐 */
}

/* 右侧组件容器 */
.device-list {
  flex: 1;
  /* 撑满剩余空间 */
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  /* 超出自动换行 */
  gap: 12px 24px;
  /* 行间距 12px，列间距 24px */
  min-height: 32px;
  /* 保证和 Element 组件高度一致 */
}

/* 风机网格专属优化 */
.inline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  /* 响应式网格，自动平铺 */
  gap: 16px;
  width: 100%;
}

.blower-group {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  /* 给风机组加一个极淡的底色包裹 */
  padding: 2px 12px;
  border-radius: 6px;
  /* 圆角 */
}

.blower-name {
  font-size: 13px;
  color: #64748b;
  margin-right: 8px;
}


/* 4. 运行时长 */
.duration-wrapper {
  display: flex;
  align-items: center;
}

.duration-label {
  font-size: 14px;
  margin-left: 6px;
  cursor: pointer;
}

.input-group {
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}

.native-input {
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  width: 60px;
  text-align: center;
  margin: 0 6px;
  outline: none;
}

.native-input:focus {
  border-color: #3b82f6;
}

.disabled-element {
  opacity: 0.4;
  pointer-events: none;
}

.unit {
  font-size: 13px;
  color: #64748b;
  margin-right: 20px;
}

.unit-tip {
  font-size: 13px;
  /* 略小于正文，突出辅助信息 */
  color: #666666;
  /* 深灰色，保证已勾选时的可读性 */
  margin-left: 12px;
  /* 与前面的“分钟”保持间距 */
  transition: color 0.3s;
  /* 状态切换时颜色过渡更平滑 */
}

/* 5. 底部按钮控制栏 */
.action-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  border-top: 2px solid #e2e8f0;
  padding-top: 20px;
}

.btn {
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-adhoc {
  background-color: #dee1e7;
  /* color: #fff; */
}

.btn-adhoc:hover {
  background-color: #ddd123;
}

.btn-success {
  background-color: #dee1e7;
  /* color: #fff; */
}


.btn-success:hover {
  background-color: #21772d;
}

.btn-danger {
  background-color: #dee1e7;
  /* color: #fff; */
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-primary {
  background-color: #3b82f6;
  color: #fff;
}

.btn-primary:hover {
  background-color: #2563eb;
}

/* 实用全局辅助工具类 */
.font-mono {
  font-family: monospace;
}

.font-bold {
  font-weight: 600;
}

.text-red {
  color: #dc2626;
  font-size: 16px;
}

.ml-4 {
  margin-left: 16px;
}

.text-sm {
  font-size: 13px;
  color: #475569;
}


.page-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: sans-serif;
}

.mode-selector {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.condition-container {
  margin-bottom: 20px;
  /* min-height: 100px; */
}

.action-bar {
  margin-top: 20px;
}

.table-wrapper {
  overflow-x: auto;
}

.native-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.native-table th,
.native-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #efefef;
}

.native-table th {
  background-color: #fafafa;
  color: #666;
  font-weight: 600;
}
</style>
