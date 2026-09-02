<template>
  <div class="granary-manager">
    <!-- ⚙️ 顶部操作栏 -->
    <div class="table-toolbar">
      <!-- <h2>🌾 廒间信息管理系统</h2> -->
      <button class="btn-add" @click="openModal('add')">➕ 新增廒间</button>
    </div>

    <!-- 🔍 顶部高级多条件联查搜索栏 -->
    <div class="search-bar">
      <!-- 条件 1：廒间搜索 -->
      <div class="search-item">
        <label>廒间搜索：</label>
        <!-- 🎯 @input="fetchGranaryList" 只要打字，就会实时连上 Python 查 MySQL -->
        <input 
          type="text" 
          v-model="searchQuery.name" 
          @input="fetchGranaryList" 
          placeholder="输入名称或编号检索..." 
        />
      </div>

      <!-- 条件 2：品种下拉 -->
      <div class="search-item">
        <label>储粮品种：</label>
        <!-- 🎯 @change="fetchGranaryList" 只要换粮食，立刻重新查数据库 -->
        <select v-model="searchQuery.grainType" @change="fetchGranaryList">
          <option value="">全部品种</option>
          <option value="小麦">🌾 小麦</option>
          <option value="稻谷">🍚 稻谷</option>
          <option value="玉米">🌽 玉米</option>
          <option value="大豆">🫘 大豆</option>
        </select>
      </div>

      <!-- 条件 3：保管员搜索 -->
      <div class="search-item">
        <label>保管员：</label>
        <input 
          type="text" 
          v-model="searchQuery.keeper" 
          @input="fetchGranaryList" 
          placeholder="输入保管员姓名..." 
        />
      </div>

      <!-- 重置条件 -->
      <button class="btn-reset" @click="resetSearch">重置条件</button>
    </div>
    <!-- 📊 廒间列表数据表格 -->
    <div class="table-container">
      <div v-if="loading" class="loading-overlay">⚙️ 正在从远端 MySQL 数据库加载数据...</div>
      <table class="custom-table">
        <thead>
          <tr>
            <th>廒间编号</th>
            <th>廒间名称</th>
            <th>设计仓容 (吨)</th>
            <th>保管员</th>
            <th>储粮品种</th>
            <th>温度上限 (°C)</th>
            <th>PLC编号</th>
            <th>操作栏</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in granaryList" :key="item.id">
            <td class="bold-text">{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.capacity }}</td>
            <td><span class="user-badge">👤 {{ item.keeper }}</span></td>
            <td><span class="grain-tag">{{ item.grain_type }}</span></td>
            <td class="warning-text">{{ item.max_temp }} °C</td>
            <td>{{ item.plc_code }}</td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" @click="openModal('edit', item)">编辑</button>
                <button class="btn-delete" @click="deleteItem(item.id)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="granaryList.length === 0">
            <td colspan="7" class="empty-text">暂无廒间数据，请点击右上角新增</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 🔔 弹出框（新增/编辑表单共用） -->
    <Transition name="modal-fade">
      <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ modalType === 'add' ? '➕ 新增廒间配置' : '📝 编辑廒间配置' }}</h3>
            <button class="close-x" @click="closeModal">×</button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="submitForm">
              <!-- 字段 1：廒间编号 -->
              <div class="form-item">
                <label>廒间编号：</label>
                <input type="text" v-model="form.code" placeholder="例如：AJ-001" :disabled="modalType === 'edit'"
                  required />
              </div>

              <!-- 字段 2：廒间名称 -->
              <div class="form-item">
                <label>廒间名称：</label>
                <input type="text" v-model="form.name" placeholder="例如：1号仓一号间" required />
              </div>

              <!-- 字段 3：设计仓容 -->
              <div class="form-item">
                <label>设计仓容 (吨)：</label>
                <input type="number" v-model.number="form.capacity" placeholder="例如：5000" min="1" required />
              </div>

              <!-- 字段 4：保管员 -->
              <div class="form-item">
                <label>保管员：</label>
                <input type="text" v-model="form.keeper" placeholder="例如：张管理员" required />
              </div>

              <!-- 字段 5：储粮品种 -->
              <div class="form-item">
                <label>储粮品种：</label>
                <select v-model="form.grain_type" required>
                  <option value="" disabled>请选择粮食品种</option>
                  <option value="小麦">🌾 小麦</option>
                  <option value="稻谷">🍚 稻谷</option>
                  <option value="玉米">🌽 玉米</option>
                  <option value="大豆">🫘 大豆</option>
                </select>
              </div>

              <!-- 字段 6：温度上限 -->
              <div class="form-item">
                <label>报警温度上限 (°C)：</label>
                <input type="number" v-model.number="form.max_temp" placeholder="例如：25" step="0.1" required />
              </div>
              <!-- 字段 7：PLC 编号 -->
              <div class="form-item">
                <label>PLC编号：</label>
                <input type="text" v-model="form.plc_code" placeholder="例如：001" required />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" @click="closeModal">取消</button>
                <button type="submit" class="btn-submit">确认保存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { reactive, computed, ref, onMounted } from 'vue'
import axios from 'axios'
// --- 1. 模拟的廒间静态底账数据集 ---
const granaryList = ref([
  // { id: 1, code: 'AJ-001', name: '1号仓北廒间', capacity: 3500, keeper: '张利国', grain_type: '小麦', max_temp: 22.0 },
  // { id: 2, code: 'AJ-002', name: '1号仓南廒间', capacity: 4000, keeper: '李庆祥', grain_type: '玉米', max_temp: 25.5 },
  // { id: 3, code: 'AJ-003', name: '2号仓东廒间', capacity: 5500, keeper: '王卫东', grain_type: '稻谷', max_temp: 20.0 },
  // { id: 4, code: 'AJ-004', name: '2号仓西廒间', capacity: 4800, keeper: '张利国', grain_type: '大豆', max_temp: 24.0 },
  // { id: 5, code: 'AJ-005', name: '3号仓一号间', capacity: 6000, keeper: '赵志强', grain_type: '小麦', max_temp: 21.5 },
  // { id: 6, code: 'AJ-006', name: '3号仓二号间', capacity: 6000, keeper: '李庆祥', grain_type: '稻谷', max_temp: 20.5 }
])

// --- 2. 搜索框响应式数据绑定 ---
const searchQuery = reactive({
  name: '',      // 对应廒间名称或编号
  grainType: '', // 对应储粮品种
  keeper: ''     // 对应保管员
})

// 重置所有搜索框
const resetSearch = () => {
  searchQuery.name = ''
  searchQuery.grainType = ''
  searchQuery.keeper = ''
}

// --- 3. 🎯 核心逻辑：计算属性实现多条件联动查询 ---
const filteredList = computed(() => {
  return granaryList.value.filter(item => {
    // A. 模糊检索：支持编号或名称，不区分字母大小写
    const matchesName =
      item.name.toLowerCase().includes(searchQuery.name.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.name.toLowerCase())

    // B. 下拉精准匹配：若没有选择具体粮食，则该条件默认为 true（直接通过）
    const matchesGrain = searchQuery.grainType === '' || item.grain_type === searchQuery.grainType

    // C. 模糊检索：保管员姓名
    const matchesKeeper = item.keeper.toLowerCase().includes(searchQuery.keeper.toLowerCase())

    // 只有当三大过滤条件在当前行同时通过（AND 关系），这行数据才会进入最终的展示列表
    return matchesName && matchesGrain && matchesKeeper
  })
})

// # --- 2. 弹窗与表单状态变量 ---
const isModalOpen = ref(false)
const modalType = ref('add')
let currentEditId = null

// # 响应式表单对象
const form = reactive({
  code: '',
  name: '',
  capacity: '',
  keeper: '',
  grain_type: '',
  max_temp: '',
  plc_code: ''
})

// # 清空表单数据
const resetForm = () => {
  form.code = ''
  form.name = ''
  form.capacity = ''
  form.keeper = ''
  form.grain_type = ''
  form.max_temp = ''
  form.plc_code= ''
  currentEditId = null
}

// # --- 3. 打开/关闭弹窗控制 ---
const openModal = (type, item = null) => {
  modalType.value = type
  isModalOpen.value = true

  if (type === 'edit' && item) {
    currentEditId = item.id
    // # 将当前行的数据拷贝到表单中（利用回显）
    form.code = item.code
    form.name = item.name
    form.capacity = item.capacity
    form.keeper = item.keeper
    form.grain_type = item.grain_type
    form.max_temp = item.max_temp
    form.plc_code= item.plc_code
  } else {
    resetForm()
  }
}

const closeModal = () => {
  isModalOpen.value = false
  resetForm()
}

// # --- 4. 提交数据（增 / 改） ---
const submitForm = async () => {
  try {
    if (modalType.value === 'add') {
      // ➕ 新增：走 POST
      await axios.post('http-api/api/granary', form)
      // alert('🎉 提示：新廒间添加成功！')

    } else if (modalType.value === 'edit') {
      console.log('正在提交编辑，当前修改的廒间ID为:', currentEditId)

      // 📝 编辑：动态将 currentEditId 拼入 URL 中，完全匹配后端的 {item_id}
      await axios.put(`http-api/api/granary/${currentEditId}`, form)
      // alert('提示：廒间信息修改成功！')
    }

    // 🔄 无论增还是改，成功后都去远端 MySQL 数据库刷一次最新数据
    await fetchGranaryList()
    closeModal()

  } catch (error) {
    console.error('保存失败:', error)
    const errorMsg = error.response?.data?.detail || '网络错误，保存失败！'
    alert(`❌ 错误：${errorMsg}`)
  }
}
// # --- 5. 删除数据（删） ---
const deleteItem = async (id) => {
  if (confirm('⚠️ 警告：确定要删除该廒间吗？删除后关联的温度历史将一同消失！')) {
    // # 💡 对应后端：
    await axios.delete(`http-api/api/granary/${id}`)
    granaryList.value = granaryList.value.filter(item => item.id !== id)
    alert('🗑️ 提示：删除成功')
  }
}

const loading = ref(false)       // 用于控制加载状态的显示

const fetchGranaryList = async () => {
  loading.value = true
  console.log('in fetchGranaryList')
  try {
    // 💡 动态将前端的输入框内容拼接到 URL 的参数中 (Query Parameters)
    const response = await axios.get("http-api/api/granary", {
      params: {
        name: searchQuery.name || undefined,
        grain_type: searchQuery.grainType || undefined,
        keeper: searchQuery.keeper || undefined
      }
    })
    // 将后端返回的 MySQL 字典列表直接赋给组件变量
    granaryList.value = response.data
  } catch (error) {
    console.error('❌ 请求后端接口失败:', error)
    alert('数据加载失败，请检查后端 FastAPI 服务是否启动！')
  } finally {
    loading.value = false
  }
}

// --- 3. 生命周期钩子：页面初始化自动加载一次 ---
onMounted(() => {
  fetchGranaryList()
})
</script>

<style scoped>
/* 基础容器 */
.granary-manager {
  padding: 24px;
  background-color: #1a1a1d;
  color: #fff;
  min-height: 100vh;
  font-family: 'PingFang SC', sans-serif;
}

/* 工具栏 */
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  color: #86c232;
  margin: 0;
  font-size: 22px;
}

.btn-add {
  background: #86c232;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #a3e044;
}

/* 表格容器样式 */
.table-container {
  background: #222629;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #474b4f;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.custom-table th,
.custom-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #474b4f;
  font-size: 14px;
}

.custom-table th {
  background-color: #1a1a1d;
  color: #86c232;
  font-weight: 600;
}

.custom-table tbody tr:hover {
  background-color: rgba(134, 194, 50, 0.05);
  /* 鼠标悬停高亮 */
}

/* 美化小部件 */
.bold-text {
  font-weight: bold;
  color: #fff;
}

.user-badge {
  background: #474b4f;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.grain-tag {
  background: rgba(134, 194, 50, 0.2);
  color: #86c232;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(134, 194, 50, 0.3);
}

.warning-text {
  color: #e74c3c;
  font-weight: bold;
}

.empty-text {
  text-align: center;
  color: #666;
  padding: 40px 0;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: opacity 0.2s;
}

.btn-edit {
  background: #3498db;
  color: white;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-edit:hover,
.btn-delete:hover {
  opacity: 0.8;
}

/* 🎯 弹出框蒙层定位 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: #222629;
  border: 1px solid #86c232;
  width: 480px;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  background: #1a1a1d;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #474b4f;
}

.modal-header h3 {
  margin: 0;
  color: #86c232;
  font-size: 16px;
}

.close-x {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 22px;
  cursor: pointer;
}

.close-x:hover {
  color: #fff;
}

/* 表单单项排版 */
.modal-body {
  padding: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-item label {
  font-size: 13px;
  color: #ccc;
}

.form-item input,
.form-item select {
  background: #1a1a1d;
  border: 1px solid #474b4f;
  color: #fff;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.form-item input:focus,
.form-item select:focus {
  border-color: #86c232;
}

/* 弹窗底部操作 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  background: #474b4f;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-submit {
  background: #86c232;
  color: #000;
  border: none;
  padding: 10px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.page-header, .table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 2px solid #222629;
  padding-bottom: 12px;
}


/* 🔍 高级搜索过滤工具栏 */
.search-bar {
  background: #222629;
  border: 1px solid #474b4f;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-end;
}
.search-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-item label {
  font-size: 13px;
  color: #86c232;
  font-weight: bold;
}
.search-bar input, .search-bar select {
  background: #1a1a1d;
  border: 1px solid #474b4f;
  color: #ffffff;
  padding: 9px 12px;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  min-width: 200px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-bar input:focus, .search-bar select:focus {
  border-color: #86c232; /* 选中时输入框边框变绿 */
  box-shadow: 0 0 5px rgba(134, 194, 50, 0.3);
}
</style>
