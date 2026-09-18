<template>
  <div class="control-panel">
    <!-- <h1 class="panel-title">智能通风作业控制面板</h1> -->

    <!-- 1. 模式选择区域 -->
    <div class="section mode-section">
      <label class="section-label"> 选择仓房：</label>
      <select v-model="selectedModeId" class="native-select mode-select" @change="handleModeChange">
        <option :value="null">-- 请选择 --</option>
        <!-- <option v-for="mode in modeList" :key="mode.id" :value="mode.id">
          {{ mode.name }}
        </option> -->
      </select>

      <label class="section-label">选择通风模式：</label>
      <select v-model="selectedModeId" class="native-select mode-select" @change="handleModeChange">
        <option :value="null">-- 请选择通风模式 --</option>
        <option v-for="mode in modeList" :key="mode.id" :value="mode.id">
          {{ mode.name }}
        </option>
      </select>


    </div>

    <!-- 2. 条件设置区域（并排显示） -->
    <div class="condition-container">
      <!-- 开始条件（横排） -->
      <div class="condition-box flex-column">
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

          <!-- <div class="form-group-inline">
        <label>3. 监测对象</label>
        <select v-model="startCondition.target" class="native-select">
          <option value="温度">温度</option>
          <option value="湿度">湿度</option>
        </select>
      </div> -->

          <div class="form-group-inline">
            <label>操作符</label>
            <select v-model="startCondition.operator" class="native-select font-mono">
              <option value=0>&gt;=</option>
              <option value=1>&lt;=</option>
            </select>
          </div>

          <!-- 新增：末尾数字输入框 -->
          <div class="form-group-inline">
            <label>阈值设定</label>
            <div class="input-unit-wrapper">
              <input v-model.number="startCondition.threshold" type="number" step="0.1" required placeholder="0.0"
                class="native-input condition-value-input" />
              <span class="inline-unit">°C</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 结束条件（动态同步与取反，同样横排） -->
      <div class="condition-box disabled-box flex-column">
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
          <!-- <div class="form-group-inline">
            <label>监测对象</label>
            <div class="sync-value">{{ startCondition.target }}</div>
          </div> -->
          <div class="form-group-inline">
            <label>操作符</label>
            <div class="sync-value font-mono font-bold text-red">
              {{ startCondition.operator == 0 ? '<' : '>' }} </div>
            </div>
            <!-- 同步显示开始条件输入的数字 -->
            <div class="form-group-inline">
              <label>联动阈值</label>
              <div class="sync-value">
                {{ startCondition.threshold }} <span class="ml-1 font-normal text-muted">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- 3. 设备选择区域 -->
      <div class="section device-section">
        <div class="section-title">设备选择控制</div>

        <!-- 通风窗 (10个) -->
        <div class="device-row">
          <span class="device-label">通风窗：</span>
          <div class="device-list">
            <label v-for="i in 10" :key="'window-' + i" class="checkbox-label">
              <input type="checkbox" :value="i" v-model="devices.windows" /> 窗 #{{ i }}
            </label>
          </div>
        </div>

        <!-- 风门 (8个) -->
        <div class="device-row">
          <span class="device-label">风门：</span>
          <div class="device-list">
            <label v-for="i in 8" :key="'damper-' + i" class="checkbox-label">
              <input type="checkbox" :value="i" v-model="devices.dampers" /> 门 #{{ i }}
            </label>
          </div>
        </div>

        <!-- 排风扇 (4个) -->
        <div class="device-row">
          <span class="device-label">排风扇：</span>
          <div class="device-list">
            <label v-for="i in 4" :key="'fan-' + i" class="checkbox-label">
              <input type="checkbox" :value="i" v-model="devices.exhaustFans" /> 扇 #{{ i }}
            </label>
          </div>
        </div>

        <!-- 空调 (2个) -->
        <div class="device-row">
          <span class="device-label">空调：</span>
          <div class="device-list">
            <label v-for="i in 2" :key="'ac-' + i" class="checkbox-label">
              <input type="checkbox" :value="i" v-model="devices.airConditioners" /> 空调 #{{ i }}
            </label>
          </div>
        </div>

        <!-- 风机 (8个，正/反单选，支持取消选中) -->
        <div class="device-row">
          <span class="device-label">风机控制：</span>
          <div class="device-list inline-grid">
            <div v-for="i in 8" :key="'blower-' + i" class="blower-group">
              <span class="blower-name">风机 #{{ i }}:</span>
              <label class="radio-label">
                <input type="radio" :name="'blower-dir-' + i" value="正" :checked="devices.blowers[i] === 1"
                  @click="toggleBlower(i, 1)" /> 正
              </label>
              <label class="radio-label">
                <input type="radio" :name="'blower-dir-' + i" value="反" :checked="devices.blowers[i] === 0"
                  @click="toggleBlower(i, 0)" /> 反
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 运行时长设置区域 -->
      <div class="section duration-section">
        <div class="duration-wrapper">
          <input type="checkbox" v-model="durationControl.enabled" id="duration-toggle" />
          <label for="duration-toggle" class="duration-label font-bold">运行时间：</label>

          <div class="input-group" :class="{ 'disabled-element': !durationControl.enabled }">
            <!-- <span class="ml-4 text-sm">运行时间：</span> -->
            <input type="number" v-model.number="durationControl.value" :disabled="!durationControl.enabled" min="1"
              placeholder="30" class="native-input duration-input" @input="validateDuration" />
            <span class="unit">分钟</span>
          </div>
        </div>
      </div>

      <!-- 5. 底部控制按钮 -->
      <div class="action-bar">
        <button class="btn btn-success" @click="handleStartJob">开始作业</button>
        <button class="btn btn-danger" @click="handleStopJob">停止作业</button>
        <button class="btn btn-primary" @click="handleSaveMode">保存模式</button>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';

// 模拟从后端获取到的通风模式列表
interface ModeItem {
  id: number;
  name: string;
  start_temp_diff: number;
  start_humidity_diff: number;
}
const layerText = ref('')
const metricText = ref('')
const layerSelRef = ref(null)
const metricSelRef = ref(null)


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

onMounted(() => {
  // layerText.value=startCondition.level
  layerText.value = layerSelRef.value.selectedOptions[0].text
  metricText.value = metricSelRef.value.selectedOptions[0].text
  devices.windows[0] = 1


  // if (defaultItem) {
  //   selectedText.value = defaultItem.name
  // }
})

const modeList = ref<ModeItem[]>([
  // { id: 1, name: '智能冬降温模式', start_temp_diff: 6.0, start_humidity_diff: 10.0 },
  { id: 1, name: '冬天外循环控温', start_temp_diff: 3.5, start_humidity_diff: 5.0 },
  { id: 2, name: '夏天内循环降温', start_temp_diff: 5.0, start_humidity_diff: 12.0 }
]);

const selectedModeId = ref<number | null>(null);

// 开始条件响应式数据
const startCondition = reactive({
  level: 0,
  metric: 'maxTemp',
  operator: 0,
  threshold: 0
});

// 设备选择响应式数据
const devices = reactive({
  windows: [] as number[],
  dampers: [] as number[],
  exhaustFans: [] as number[],
  airConditioners: [] as number[],
  // 8个风机，用 Record<键, 值> 存储。值可以是 '正' | '反' | null
  blowers: reactive<Record<number, 1 | 0 | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null
  })
});

// 运行时长控制
const durationControl = reactive({
  enabled: false,
  value: 30
});

// 模式切换联动处理
const handleModeChange = () => {
  if (selectedModeId.value) {
    const currentMode = modeList.value.find(m => m.id === selectedModeId.value);
    if (currentMode) {
      console.log(`已联动切换至模式: ${currentMode.name}`);
      // 业务扩展点：这里可以根据选中的模式从后端获取关联的默认设备或条件设置
    }
  }
};

// 风机正反单选框逻辑：点击已选中的则“取消选中”
const toggleBlower = (index: number, direction: 1 | 0) => {
  if (devices.blowers[index] === direction) {
    devices.blowers[index] = null; // 取消选中
  } else {
    devices.blowers[index] = direction; // 切换或选中
  }
};

// 限制运行时间只能输入正整数
const validateDuration = () => {
  if (typeof durationControl.value === 'number') {
    durationControl.value = Math.max(1, Math.floor(durationControl.value));
  } else {
    durationControl.value = 30;
  }
};

// ==================== 按钮核心逻辑（确认框交互） ====================

const houseCode = 1

// 1. 开始作业
const handleStartJob = async () => {
  const isConfirmed = confirm("⚠️ 警告：确定要立即下发控制指令，【开始通风作业】吗？");

  if (isConfirmed) {
    alert("系统指令已下发：通风作业启动中...");
    // TODO: 调用后端异步开始接口
    try {
      //todo: device address hardcoded, will modify later
      await axios.post("http-api/api/schedule/venti", {
        house_code: houseCode,
        devices: devices,
        trigger_condition: startCondition
      });
      // console.log('result ', result)
    } catch (err) {
      alert('操作失败，请检查 PLC 连接');
    } finally {
      console.log('finished mode switch')
    }
  }
}

// 2. 停止作业
const handleStopJob = () => {
  const isConfirmed = confirm("🚨 紧急提示：确定要立刻强行【停止当前通风作业】吗？所有关联设备将关闭！");
  if (isConfirmed) {
    alert("系统指令已下发：设备正在全面紧急关闭...");
    // TODO: 调用后端异步停止接口
  }
};

// 3. 保存模式
const handleSaveMode = () => {
  if (selectedModeId.value !== null) {
    // 当前选中了某个现有模式
    const currentMode = modeList.value.find(m => m.id === selectedModeId.value);
    const isConfirmed = confirm(`检测到您当前选中了模式【${currentMode?.name}】。\n是否要【覆盖】该模式的现有配置？`);
    if (isConfirmed) {
      alert(`已成功更新并覆盖模式：${currentMode?.name}`);
      // TODO: 调用后端覆盖保存的 PATCH 接口
    }
  } else {
    // 未选择模式，属于直接保存为新配置
    alert("当前未选择任何基础模式，已将当前配置保存为全局通用通风策略。");
    // TODO: 调用后端普通保存 POST 接口
  }
};
</script>


<style scoped>
.control-panel {
  padding: 20px;
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

.condition-box {
  /* justify-content: left; */
  /* flex: 1; */
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  width: 1000px;
}

.box-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.start-title {
  color: #2563eb;
}

.end-title {
  color: #475569;
}


/* 联动禁用区域效果 */
.disabled-box {
  background-color: #f8fafc;
}

.sync-value {
  padding: 8px 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
  min-height: 20px;
  color: #334155;
  display: flex;
  align-items: center;
}

/* 3. 设备列表排版 */
.device-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px dashed #f1f5f9;
  align-items: flex-start;
}

.device-row:last-child {
  border-bottom: none;
}

.device-label {
  width: 90px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  padding-top: 2px;
}

.device-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  flex: 1;
}

.checkbox-label,
.radio-label {
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

/* 风机网格排版 */
.inline-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 20px;
}

.blower-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #f1f5f9;
}

.blower-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  margin-right: 4px;
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

.btn-success {
  background-color: #22c55e;
  color: #fff;
}

.btn-success:hover {
  background-color: #16a34a;
}

.btn-danger {
  background-color: #ef4444;
  color: #fff;
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
</style>
