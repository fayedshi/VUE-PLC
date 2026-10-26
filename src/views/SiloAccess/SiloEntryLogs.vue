<template>
    <div class="logs-card-container">
        <!-- 使用 ElCard 包裹，让界面具备工业看板的品质感 -->
        <el-card class="box-card" shadow="hover">
            <template #header>
                <div class="card-header">
                    <span class="title">📋 查粮门禁 - 开仓记录</span>
                    <!-- 刷新按钮 -->
                    <el-button type="primary" size="small" :loading="entryLogs.isLoading" @click="fetchEntryLogs">
                        手动刷新
                    </el-button>
                </div>
            </template>

            <!-- 异常状态横幅提示 -->
            <el-alert v-if="entryLogs.errorMsg" :title="`数据加载失败: ${entryLogs.errorMsg}`" type="error" show-icon
                style="margin-bottom: 15px;" />

            <!-- 
        Element Plus 表格组件 
        v-loading: 自带极其丝滑的加载遮罩层动画
      -->
            <el-table v-loading="entryLogs.isLoading" element-loading-text="⚡ 正在安全连接粮库系统..." :data="entryLogs.list"
                stripe border style="width: 100%" :table-layout="auto">
                <!-- 记录ID -->
                <el-table-column prop="id" label="记录ID" align="center" />

                <!-- 仓房编号 -->

                <el-table-column prop="dev_id" label="设备端ID" />
                <el-table-column prop="dev_serial" label="设备" />
                <!-- <el-table-column prop="granary_id" label="仓房编号" /> -->
                <el-table-column prop="silo_name" label="仓房" />
                <!-- 操作人员 -->
                <el-table-column prop="operators" label="操作人员" />

                <!-- 开仓时间 -->
                <el-table-column prop="open_time" label="开仓时间" align="center" />

                <!-- 开仓状态：利用 #default 插槽动态渲染彩色 Tag -->
                <el-table-column label="状态" align="center">
                    <template #default="scope">
                        <el-tag :type="scope.row.status === 'SUCCESS' ? 'success' : 'danger'" disable-transitions>
                            {{ scope.row.status === 'SUCCESS' ? '🟢 正常' : '🔴 异常' }}
                        </el-tag>
                    </template>
                </el-table-column>
            </el-table>
            <!-- <div class="pagination-container">
                <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
                    :page-sizes="pagination.pages" :small="false" :disabled="entryLogs.isLoading"
                    :background="true" layout="total, sizes, prev, pager, next, jumper" :total="pagination.total"
                    @current-change="handleCurrentChange" />
            </div> -->
            <!-- <div class="pagination-container">
                <el-pagination v-model:current-page="pagination.current"
                    :page-size="pagination.pageSize" :disabled="pagination.isLoading" background
                    layout="prev, pager, next" :total="pagination.total" @current-change="handleCurrentChange" />
            </div> -->
            <div class="pagination">
                <button :disabled="pagination.current === 1" @click="handleCurrentChange(-1)">上一页</button>
                <span class="page-info">第 {{ pagination.current }} 页 / 共 {{ pagination.pages }} 页</span>
                <button :disabled="pagination.current >= pagination.pages" @click="handleCurrentChange(1)">下一页</button>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import axios from 'axios'
// 💡 如果你的项目中使用了 Element Plus 的独立消息提示，可以引入它
import { ElMessage } from 'element-plus'
import http from '../../../api/http'

// 1. 定义响应式的开仓记录状态
const entryLogs = reactive({
    list: [],
    isLoading: false,
    errorMsg: '',
    // pagination: {
    //     "current": null,
    //     "pageSize": null,
    //     "total": null,
    //     "pages": null
    // }
})

const pagination = reactive({
    "current": 1,
    "pageSize": 10,
    "total": 0,
    "pages": 0
})
// 2. 核心异步链式请求函数
const fetchEntryLogs = async () => {
    entryLogs.isLoading = true
    entryLogs.errorMsg = ''

    try {
        // 步骤 B: 携带 Token 请求开仓记录数据
        const logsResponse = await http.get('/api/granary-entry-logs', {
            params: { page: pagination.current ? pagination.current : 1, page_size: pagination.pageSize }
        })
        entryLogs.list = logsResponse.data.items || []
        Object.assign(pagination, logsResponse.data.pagination)
        console.log('pagination:', pagination)
    } catch (error) {
        console.error("❌ 获取开仓记录失败:", error)
        // entryLogs.errorMsg = error.response?.data?.detail || error.message || "网络连接异常"
        // 弹出 Element 优雅的红牌报错提示
        // ElMessage.error(`⚠️ 🛠️ 粮库系统错误: ${entryLogs.errorMsg}`)

        // 发生异常时清空残留数据
        entryLogs.list = []
    } finally {
        entryLogs.isLoading = false
    }
}

// 3. 🔑 新增：处理每页条数（PageSize）发生变化的事件
// const handleSizeChange = (newSize) => {
//     entryLogs.pageSize = newSize
//     entryLogs.currentPage = 1 // 切换条数后，习惯上重置回第一页
//     fetchOpeningLogsWorkflow()
// }

// 4. 🔑 新增：处理页码（CurrentPage）发生变化的事件
const handleCurrentChange = (step) => {
    pagination.current += step
    fetchEntryLogs()
}

// 3. 生命周期钩子
onMounted(() => {
    fetchEntryLogs()
})
</script>

<style scoped>
.logs-card-container {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: 700px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
}


/* --- 分页系统 --- */
.pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
}

.pagination button {
    padding: 6px 12px;
    border: 1px solid #d9d9d9;
    background: #fff;
    cursor: pointer;
    border-radius: 4px;
}

.pagination button:disabled {
    background: #f5f5f5;
    color: #ccc;
    cursor: not-allowed;
}

/* 调谐 Element 默认边框样式 */
.box-card {
    border-radius: 8px;
}
</style>
