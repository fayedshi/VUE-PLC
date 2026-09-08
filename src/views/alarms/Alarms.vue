<template>
    <div class="grain-alarm-container">

        <!-- 1. 📊 顶部：实时未消除报警看板 -->
        <div class="card real-time-card">
            <div class="card-header">
                <span class="pulse-icon"></span>
                <h3>实时未消除报警 ({{ activeAlarms.length }} 个仓房异常)</h3>
            </div>

            <div class="table-wrapper">
                <table class="native-table">
                    <thead>
                        <tr>
                            <th>触发时间</th>
                            <th>仓房名称</th>
                            <th>报警类型</th>
                            <th>异常详情</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="activeAlarms.length === 0">
                            <td colspan="4" class="empty-cell">👍 当前所有仓房运行状态正常，仓储环境安全</td>
                        </tr>
                        <tr v-for="item in activeAlarms" :key="item.house_code + item.type"
                            :class="['alarm-row', item.type]">
                            <td class="time-cell">{{ item.time }}</td>
                            <td><strong>{{ item.house_code }}</strong></td>
                            <td>
                                <span
                                    :class="['badge', item.type === 'PLC_DISCONNECT' ? 'badge-danger' : 'badge-warning']">
                                    {{ item.type === 'PLC_DISCONNECT' ? '⚡ PLC断线' : '🔥 温度超限' }}
                                </span>
                            </td>
                            <td class="msg-cell">{{ item.message }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 2. 📜 底部：历史报警日志追溯 -->
        <div class="card history-card">
            <div class="card-header">
                <h3>历史报警日志追溯</h3>
            </div>

            <!-- 原生查询工具栏 -->
            <div class="filter-bar">
                <select v-model="historyQuery.houseId" class="native-select">
                    <option value="">全部仓房</option>
                    <option value="CH-01">1号平房仓</option>
                    <option value="CH-02">2号平房仓</option>
                    <option value="CH-03">3号高架仓</option>
                </select>
                <button class="btn-search" @click="fetchHistoryAlarms">🔍 查询历史</button>
            </div>

            <div class="table-wrapper">
                <table class="native-table">
                    <thead>
                        <tr>
                            <th>报警时间</th>
                            <th>仓房名称</th>
                            <th>类型</th>
                            <th>报警内容</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(log, index) in historyLog" :key="index">
                            <td>{{ log.time }}</td>
                            <td>{{ log.house_name }}</td>
                            <td>{{ log.type === 'PLC_DISCONNECT' ? 'PLC断线' : '温度超限' }}</td>
                            <td>{{ log.message }}</td>
                            <td><span class="badge badge-success">已恢复</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 原生简易分页器 -->
            <div class="pagination">
                <button :disabled="historyQuery.page === 1" @click="changePage(-1)">上一页</button>
                <span class="page-info">第 {{ historyQuery.page }} 页 / 共 {{ Math.ceil(historyTotal / historyQuery.size)
                    || 1 }} 页</span>
                <button :disabled="historyQuery.page * historyQuery.size >= historyTotal"
                    @click="changePage(1)">下一页</button>
            </div>
        </div>

        <!-- 3. 🚨 浏览器内置/原生模拟弹窗挂载点 -->
        <div class="toast-container">
            <div v-for="toast in toastList" :key="toast.id" :class="['toast', toast.type]">
                <div class="toast-title">{{ toast.title }}</div>
                <div class="toast-body">{{ toast.body }}</div>
                <button class="toast-close" @click="removeToast(toast.id)">×</button>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

// --- 实时报警状态 ---
const activeAlarmsMap = ref({})
const activeAlarms = ref([])
let wsClients = []

// --- 历史报警状态 ---
const historyLog = ref([])
const historyTotal = ref(0)
const historyQuery = reactive({
    page: 1,
    size: 10,
    houseId: ''
})

// --- 原生轻量弹窗队列 ---
const toastList = ref([])
let toastIdCounter = 0
let houseCount = 5
const showToast = (title, body, type = 'warning') => {
    const id = toastIdCounter++
    toastList.value.push({ id, title, body, type })
    // 5秒后自动关闭
    setTimeout(() => removeToast(id), 5000)
}

const removeToast = (id) => {
    toastList.value = toastList.value.filter(t => t.id !== id)
}

// 🔌 初始化 WebSocket：实时收集报警
const initWebSocket = (houseCnt) => {
    for (let i = 1; i <= houseCnt; i++) {
        // console.log(`当前次数: ${i}`);
        wsClients[i] = new WebSocket(`ws-00${i}-api/ws/alarms`)
        wsClients[i].onmessage = (event) => {
            const data = JSON.parse(event.data)

            // if (data.event === 'INIT_ACTIVE_ALARMS') {
            // if(data)
                // console.log('data ', data)
            //todo: remove alarms of current house first
            for (const [key, value] of Object.entries(data)) {
                // console.log(`键是: ${key}, 值是: ${value}`, 'embed value: ', data[key]);
                // console.log('value :',value)
                activeAlarmsMap.value[key] = value
            }
            // console.log('activeAlarmsMap ',activeAlarmsMap.value)
            activeAlarms.value = Object.values(activeAlarmsMap.value);
            // for key, value in data.items():
            //     print(f"键: {key} -> 值: {value}")
            
            // console.log('receivd alarms', activeAlarms.value)
            // return
            // }

            // if (data.event === 'ALARM_TRIGGER') {
            //     const exists = activeAlarms.value.some(item => item.house_id === data.house_id && item.type === data.type)
            //     if (!exists) {
            //         activeAlarms.value.push(data)
            //         // 触发原生模拟弹窗
            //         showToast(
            //             data.type === 'PLC_DISCONNECT' ? '⚡ 通信中断故障' : '🔥 仓储温度告警',
            //             data.message,
            //             data.type === 'PLC_DISCONNECT' ? 'danger' : 'warning'
            //         )
            //     }
            // }

            // if (data.event === 'ALARM_RECOVER') {
            //     activeAlarms.value = activeAlarms.value.filter(
            //         item => !(item.house_id === data.house_id && item.type === data.type)
            //     )
            // }
        }

        wsClients[i].onclose = () => {

            // setTimeout(initWebSocket, 3000) // 自动重连
        }
    }

}

// 🌐 纯原生 Fetch 请求：获取历史报警数据
const fetchHistoryAlarms = async () => {
    try {
        // 拼接查询参数
        const url = new URL('http://localhost:8000/api/alarms/history')
        url.searchParams.append('page', historyQuery.page)
        url.searchParams.append('size', historyQuery.size)
        if (historyQuery.houseId) url.searchParams.append('house_id', historyQuery.houseId)

        const response = await fetch(url)
        const resData = await response.json()

        historyLog.value = resData.list
        historyTotal.value = resData.total
    } catch (err) {
        console.error('获取历史报警失败:', err)
    }
}

const changePage = (step) => {
    historyQuery.page += step
    fetchHistoryAlarms()
}

onMounted(() => {
    // fetch house count

    initWebSocket(houseCount)
    fetchHistoryAlarms()
})

onBeforeUnmount(() => {
    for (let i = 1; i <= houseCount; i++) {
        if (wsClients[i])
            wsClients[i].close()
    }

})
</script>

<style scoped>
/* --- 基础布局 --- */
.grain-alarm-container {
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: #f5f7fa;
    min-height: 100vh;
    box-sizing: border-box;
}

.card {
    background: #ffffff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    border: 1px solid #eef1f6;
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #f0f2f5;
    padding-bottom: 12px;
}

.card-header h3 {
    margin: 0;
    font-size: 18px;
    color: #2c3e50;
}

/* 呼吸灯特效动画 */
.pulse-icon {
    width: 10px;
    height: 10px;
    background-color: #ff4d4f;
    border-radius: 50%;
    margin-right: 10px;
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
    animation: pulse 1.6s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(255, 77, 79, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
    }
}

/* --- 原生表格美化 --- */
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

.empty-cell {
    text-align: center;
    padding: 32px !important;
    color: #999;
}

/* 报警行高亮背景调色 */
.alarm-row.PLC_DISCONNECT {
    background-color: #fff1f0;
}

.alarm-row.TEMP_HIGH {
    background-color: #fffbe6;
}

/* --- 状态标签 Badge --- */
.badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.badge-danger {
    background: #ff4d4f;
    color: #fff;
}

.badge-warning {
    background: #faad14;
    color: #fff;
}

.badge-success {
    background: #52c41a;
    color: #fff;
}

/* --- 表单查询控制栏 --- */
.filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

.native-select {
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    outline: none;
    min-width: 160px;
}

.btn-search {
    background: #1890ff;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-search:hover {
    background: #40a9ff;
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

/* --- 右上角轻量级通知弹窗（纯CSS） --- */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.toast {
    width: 320px;
    padding: 16px;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 5px solid #faad14;
    position: relative;
    animation: slideIn 0.3s ease;
}

.toast.danger {
    border-left-color: #ff4d4f;
}

.toast-title {
    font-weight: bold;
    margin-bottom: 4px;
    color: #333;
}

.toast-body {
    font-size: 13px;
    color: #666;
}

.toast-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
}

@keyframes slideIn {
    from {
        transform: translateX(120%);
        opacity: 0;
    }

    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
