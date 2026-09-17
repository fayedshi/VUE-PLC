<template>
  <div class="container">
    <!-- 头部栏 -->
    <div class="header">
      <h2>通风模式管理</h2>
      <button class="btn btn-primary" @click="handleCreate">新建模式</button>
    </div>

    <!-- 数据表格 -->
    <div class="table-wrapper">
      <table class="native-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>模式名称</th>
            <th>起始温度差 (°C)</th>
            <th>起始仓内湿度 (%)</th>
            <th>结束温度差 (°C)</th>
            <th>结束仓内湿度 (%)</th>
            <th style="text-align: center;">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 1. 加载中状态 -->
          <!-- <tr v-if="loading">
            <td colspan="7" class="text-center text-muted">正在加载数据...</td>
          </tr>

          2. 无数据状态
          <tr v-elif="tableData.length === 0">
            <td colspan="7" class="text-center text-muted">暂无数据</td>
          </tr> -->
          <!-- <template v-else> -->
          <tr v-for="row in tableData" :key="row.id">
            <td>{{ row.id }}</td>
            <td class="font-bold">{{ row.name }}</td>
            <td>{{ row.start_temp_diff.toFixed(1) }}</td>
            <td>{{ row.start_humidity_diff.toFixed(1) }}</td>
            <td>{{ row.end_temp_diff.toFixed(1) }}</td>
            <td>{{ row.end_humidity_diff.toFixed(1) }}</td>
            <td class="action-cell">
              <button class="btn-text btn-edit" @click="handleEdit(row)">编辑</button>
              <button class="btn-text btn-delete" @click="handleDelete(row)">删除</button>
            </td>
          </tr>
          <!-- </template> -->
        </tbody>

      </table>
    </div>

    <!-- 分页控件 -->
    <div class="pagination">
      <span>共 {{ total }} 条记录</span>
      <div class="page-controls">
        <button :disabled="queryParams.page === 1" @click="changePage(queryParams.page - 1)">
          上一页
        </button>
        <span class="current-page">第 {{ queryParams.page }} 页</span>
        <button :disabled="queryParams.page * queryParams.size >= total" @click="changePage(queryParams.page + 1)">
          下一页
        </button>
      </div>
    </div>

    <!-- 纯原生模态弹窗 -->
    <div v-if="dialog.visible" class="modal-overlay">
      <div class="modal-content">
        <h3 class="modal-title">{{ dialog.title }}</h3>

        <form @submit.prevent="submitForm">
          <div class="form-item">
            <label>模式名称</label>
            <input v-model="form.name" type="text" required placeholder="请输入模式名称" />
          </div>

          <!-- 开始条件分组 -->
          <div class="condition-group">
            <div class="group-title">开始条件</div>
            <div class="form-row">
              <div class="form-item-inline">
                <label class="form-label">上层平均粮温 - 大气温度 >=</label>
                <!-- <div class="input-wrapper"> -->
                  <input v-model.number="form.start_temp_diff" type="number" step="0.1" placeholder="5.0" required
                    class="short-input" />
                  <span class="unit">°C</span>
                <!-- </div> -->
              </div>
              同时
              <div class="form-item-inline">
                <label class="form-label">仓内湿度 >=</label>
                <!-- <div class="input-wrapper"> -->
                  <input v-model.number="form.start_humidity_diff" type="number" step="0.1" placeholder="5.0" required
                    class="short-input" />
                  <span class="unit">%</span>
                <!-- </div> -->
              </div>
            </div>
          </div>

          <!-- 结束条件分组 -->
          <div class="condition-group">
            <div class="group-title">结束条件</div>
            <div class="form-row">
              <div class="form-item-inline">
                <label class="form-label">上层平均粮温 - 大气温度 >=</label>
                <div class="input-wrapper">
                  <input v-model.number="form.end_temp_diff" type="number" step="0.1" placeholder="5.0" required
                    class="short-input" />
                  <span class="unit">°C</span>
                </div>
              </div>
              同时
              <div class="form-item-inline">
                <label class="form-label">仓内湿度 < </label>
                <!-- <div class="input-wrapper"> -->
                  <input v-model.number="form.end_humidity_diff" type="number" step="0.1" placeholder="5.0" required
                    class="short-input" />
                  <span class="unit">%</span>
                <!-- </div> -->
              </div>
            </div>
          </div>


          <!-- 弹窗底部操作 -->
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="dialog.visible = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitLoading">
              {{ submitLoading ? '提交中...' : '确定' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ventiApi, VentilationMode } from '../../../api/ventiApi';

const loading = ref(false);
const submitLoading = ref(false);
const tableData = ref<VentilationMode[]>([]);
const total = ref(0);

const queryParams = reactive({ page: 1, size: 10 });
const dialog = reactive({ visible: false, title: '新增通风模式' });

const defaultForm: VentilationMode = {
  name: '',
  start_temp_diff: 0.0,
  start_humidity_diff: 0.0,
  end_temp_diff: 0.0,
  end_humidity_diff: 0.0
};
const form = ref<VentilationMode>({ ...defaultForm });

const fetchData = async () => {
  loading.value = true;
  try {
    const data = await ventiApi.getPage(queryParams.page, queryParams.size);
    tableData.value = data.items;
    total.value = data.total;
  } catch (error) {
    alert('数据加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage: number) => {
  queryParams.page = newPage;
  fetchData();
};

const handleCreate = () => {
  dialog.title = '新增通风模式';
  form.value = { ...defaultForm };
  dialog.visible = true;
};

const handleEdit = (row: VentilationMode) => {
  dialog.title = '编辑通风模式';
  form.value = { ...row };
  dialog.visible = true;
};

const submitForm = async () => {
  submitLoading.value = true;
  try {
    if (form.value.id) {
      await ventiApi.update(form.value.id, form.value);
    } else {
      await ventiApi.create(form.value);
    }
    dialog.visible = false;
    fetchData();
  } catch (error) {
    alert('提交失败，请检查输入或网络');
  } finally {
    submitLoading.value = false;
  }
};

const handleDelete = async (row: VentilationMode) => {
  if (!row.id) return;
  if (confirm(`确定要删除通风模式【${row.name}】吗？`)) {
    try {
      await ventiApi.delete(row.id);
      fetchData();
    } catch (error) {
      alert('删除失败');
    }
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* 基础布局 */
.container {
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

/* 按钮通用样式 */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #1677ff;
  color: #fff;
}

.btn-primary:hover {
  background-color: #4096ff;
}

.btn-default {
  background-color: #fff;
  border-color: #d9d9d9;
  color: rgba(0, 0, 0, 0.88);
}

.btn-default:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 表格样式 */
.table-wrapper {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.native-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.native-table th {
  background-color: #fafafa;
  padding: 12px 16px;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
  color: rgba(0, 0, 0, 0.88);
}

.native-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.native-table tbody tr:hover {
  background-color: #f8f8f8;
}

.font-bold {
  font-weight: 600;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #999;
}

/* 表格内文本链接按钮 */
.action-cell {
  text-align: center;
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0 8px;
}

.btn-edit {
  color: #1677ff;
}

.btn-edit:hover {
  color: #4096ff;
}

.btn-delete {
  color: #ff4d4f;
}

.btn-delete:hover {
  color: #ff7875;
}

/* 分页 */
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-controls button {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.page-controls button:disabled {
  background: #f5f5f5;
  color: #c0c0c0;
  cursor: not-allowed;
}

.current-page {
  font-weight: 500;
}

/* 模态弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 500px;
  padding: 24px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08);
}

.modal-title {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
}

/* 表单布局 */
/* .form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
} */

.form-row {
  /* display: flex; */
  /* gap: 16px; */
}

.form-row .form-item {
  display: flex;
  justify-content: center;
  /* flex: 1; */
}

.form-item label {
  margin-bottom: 6px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.form-item input {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-item input:focus {
  border-color: #4096ff;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}


.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 组间距 */
}

.form-group {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #f9f9f9;
}

.group-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #409eff;
  /* 强调色下划线 */
  display: inline-block;
  padding-bottom: 4px;
}

/* 条件分组外壳 */
.condition-group {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fafafa;
}

/* 分组标题 */
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
  padding-left: 6px;
  border-left: 3px solid #1677ff;
  line-height: 1;
}

/* 表单行：在一行内横排两个控制组 */
.form-row {
  display: flex;
  gap: 20px;
}

/* 单个表单项：让 Label 和 Input 核心横排对齐 */
.form-item-inline {
  display: flex;
  align-items: center;
  flex: 1;
  /* 平分当前行的空间 */
}

/* 文本标签 */
.form-label {
  font-size: 13px;
  color: #555;
  white-space: nowrap;
  /* 拒绝换行 */
  margin-right: 8px;
  /* 与输入框的间距 */
  width: fit-content;
  /* 固定标签宽度实现对齐 */
}

/* 输入框组合区域（包含输入框与单位） */
.input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 30px 超精致紧凑输入框 */
.short-input {
  width: 35px;
  /* 30px极其容易溢出，此处微调至35px或40px最佳，可根据喜好改回30px */
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  text-align: center;
  /* 让数字居中显示更美观 */
  transition: border-color 0.2s;
}

.short-input:focus {
  border-color: #4096ff;
}

/* 后置单位样式 */
.unit {
  font-size: 13px;
  color: #888;
  white-space: nowrap;
}

/* 彻底隐去原生数字输入框的可恶小箭头，防止挤压 30px 空间 */
.short-input::-webkit-outer-spin-button,
.short-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.short-input[type=number] {
  -moz-appearance: textfield;
}
</style>
