<template>
    <div class="venti-task-container">
        <!-- 1. 顶部筛选表单 -->
        <el-card class="filter-card" shadow="never">
            <el-form :inline="true" :model="queryParams" ref="queryFormRef" class="demo-form-inline">
                <el-form-item  prop="house_code">
                    <!-- <el-input v-model="queryParams.house_code" placeholder="请输入仓房代码" clearable true /> -->
                    <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
                </el-form-item>

                <el-form-item label="模式名称" prop="mode_name">
                    <el-input v-model="queryParams.mode_name" placeholder="请输入模式名称" clearable true />
                </el-form-item>

                <el-form-item label="状态信息">
                    <!-- <el-input v-model="queryParams.status_text" placeholder="请输入状态信息" clearable true /> -->
                    <el-select clearable true v-model="activeStatus" @change="handlePlantChange" style="width: 150px;"
                        placeholder="">
                        <el-option v-for="status in statusList" :key="status.value" :label="status.desc"
                            :value="status.value" />
                    </el-select>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="handleQuery">查询</el-button>
                    <el-button @click="resetQuery">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 2. 数据表格卡片 -->
        <el-card class="table-card" shadow="never">
            <el-table v-loading="loading" :data="taskList" border>
                <el-table-column prop="id" label="作业ID" align="center" />
                <el-table-column prop="house_code" label="仓房代码" align="center" />
                <!-- <el-table-column prop="mode_id" label="模式ID" align="center" /> -->
                <el-table-column prop="mode_name" label="模式名称">
                    <template #default="scope">
                        <!-- 如果 scope.row.mode_name 为空，则显示 '暂无模式' -->
                        {{ scope.row.mode_name || '即时作业' }}
                    </template>
                </el-table-column>
                <el-table-column prop="status_code" label="状态代码" align="center" />
                <el-table-column prop="status_text" label="状态信息" align="center">
                    <template #default="scope">
                        <!-- 示例：你可以根据状态代码为状态文本添加不同的标签颜色 -->
                        <el-tag :type="scope.row.status_code === 1 ? 'success' : 'info'">
                            {{ scope.row.status_text }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="create_time" label="创建时间" width="180" align="center" />
                <el-table-column prop="update_time" label="更新时间" width="180" align="center" />
            </el-table>

            <!-- 3. 简易分页组件 -->
            <div class="pagination-container">
                <el-pagination v-model:current-page="queryParams.page" v-model:page-size="queryParams.pageSize"
                    :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="total"
                    @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import HouseSelect from '../components/HouseSelect.vue'
// 1. 加载状态与表单引用
const loading = ref(false)
const queryFormRef = ref(null)
const selectedHouseCode = ref('');
const statusList = ref([])
const activeStatus = ref()

// 2. 筛选和分页的查询参数
const queryParams = reactive({
    house_code: '',
    mode_name: '',
    status_code: null,
    page: 1,       // 当前页码
    page_size: 10   // 每页条数
})

// 3. 列表数据与总条数
const taskList = ref([])
const total = ref(0)

// 4. 模拟 API 请求方法（实际开发中请替换为你的 axios 请求）
const fetchTaskList = async () => {
    loading.value = true
    try {
        queryParams.status_code = activeStatus.value
        queryParams.house_code = selectedHouseCode.value
        console.log('发送给后端的参数：', queryParams)

        const res = await http.get('/api/ventilation_jobs', { params: queryParams })
        taskList.value = res.data.items
        total.value = res.data.total

        // setTimeout(() => {
        //   // 模拟数据
        //   taskList.value = [
        //     { id: 1, house_code: 'A01', mode_id: 10, mode_name: '智能通风模式', status_code: 1, status_text: '进行中', create_time: '2026-10-23 10:00:00', update_time: '2026-10-23 11:00:00' },
        //     { id: 2, house_code: 'B03', mode_id: 12, mode_name: '定时排风模式', status_code: 0, status_text: '已停止', create_time: '2026-10-22 09:30:00', update_time: '2026-10-22 17:30:00' },
        //   ]
        //   total.value = 2 // 模拟的总数据量
        // }, 500)
    } catch (error) {
        ElMessage.error('获取作业列表失败')
    }
    finally {
        loading.value = false
    }
}

// 5. 事件处理：查询
const handleQuery = () => {
    queryParams.page = 1 // 每次点击查询按钮，强制回到第一页
    fetchTaskList()
}

// 6. 事件处理：重置
const resetQuery = () => {
    if (!queryFormRef.value) return
    queryFormRef.value.resetFields() // 清空表单字段
    handleQuery()
}

// 7. 分页事件：每页条数改变
const handleSizeChange = (val) => {
    queryParams.pageSize = val
    fetchTaskList()
}

// 8. 分页事件：页码改变
const handleCurrentChange = (val) => {
    queryParams.page = val
    fetchTaskList()
}

const getStatusList = async () => {

    try {
        console.log('发送给后端的参数：', queryParams)

        const res = await http.get('/api/venti_status')
        statusList.value = res.data
        // total.value = res.data.total

    } catch (error) {
        // ElMessage.error('获取作业列表失败')
    }

}


// 9. 生命周期：组件挂载时自动加载数据
onMounted(async () => {
    await getStatusList()
    fetchTaskList()
})
</script>

<style scoped>
.venti-task-container {
    padding: 20px;
}

.filter-card {
    margin-bottom: 20px;
    background-color: #fafafa;
}

.table-card {
    min-height: 400px;
}

.pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    /* 分页组件靠右对齐 */
}
</style>
