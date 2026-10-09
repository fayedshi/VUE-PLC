<template>
    <div class="monitor-dashboard">
        <el-container class="main-container">

            <!-- 1. 左侧侧边栏：录像机与通道树形导航 -->
            <el-aside width="280px" class="aside-menu">
                <div class="aside-header">📋 设备与仓位选择</div>

                <!-- 录像机下拉选择下拉框 -->
                <div class="nvr-selector-box">
                    <span class="label">选择录像机：</span>
                    <el-select v-model="activeNvrId" placeholder="请选择硬盘录像机" @change="handleNvrChange"
                        style="width: 100%">
                        <el-option v-for="nvr in nvrList" :key="nvr.id" :label="nvr.name" :value="nvr.id" />
                    </el-select>
                </div>

                <!-- 当前录像机下的通道列表 -->
                <div class="channel-list-box">
                    <div class="sub-title">🎥 视频通道 (共 {{ currentChannels.length }} 个)</div>
                    <div v-for="ch in currentChannels" :key="ch.id" class="channel-item"
                        :class="{ 'is-active': activeChannelId === ch.id }" @click="selectChannel(ch.id)">
                        <el-icon class="icon-camera">
                            <VideoCamera />
                        </el-icon>
                        <span class="channel-name">{{ ch.name }}</span>
                        <el-tag size="small" :type="activeChannelId === ch.id ? 'success' : 'info'">
                            {{ ch.id }}
                        </el-tag>
                    </div>
                    <el-empty v-if="!activeNvrId" description="请先选择一台录像机" :image-size="60" />
                </div>
            </el-aside>

            <!-- 2. 右侧主体区域 -->
            <el-main class="content-main">

                <!-- 顶部核心控制栏：时间选择、搜索回放、切换回实时 -->
                <el-card class="controls-card" shadow="never">
                    <div class="controls-wrapper">
                        <div class="time-picker-block">
                            <span class="ctrl-label">选择回放开始时间：</span>
                            <el-date-picker v-model="controls.start_time" type="datetime" placeholder="请选择回放时间"
                                style="width: 200px" :disabled="!activeChannelId || isLive" />
                        </div>

                        <div class="btn-group">
                            <!-- 搜索回放按钮 -->
                            <el-button type="primary" :icon="Search" :loading="isSearching"
                                :disabled="!activeChannelId || !controls.start_time" @click="handleSearchPlayback">
                                搜索历史回放
                            </el-button>

                            <!-- 切回实时监控按钮 -->
                            <el-button type="success" :icon="Refresh" :disabled="!activeChannelId || isLive"
                                @click="switchToLive">
                                切回实时画面
                            </el-button>
                        </div>

                        <div class="status-badge">
                            <el-tag :type="isLive ? 'danger' : 'warning'" effect="dark">
                                {{ isLive ? '● 正在浏览实时画面' : '⏳ 正在浏览历史录像' }}
                            </el-tag>
                        </div>
                    </div>
                </el-card>

                <!-- 下方核心视频窗：点击其他通道时由于销毁重新实例化，画面会被自动覆盖 -->
                <el-card class="video-container-card" shadow="never">
                    <div class="video-wrapper">
                        <canvas v-if="activeChannelId" :key="renderKey" ref="canvasRef" width="640" height="360"
                            class="video-canvas"></canvas>

                        <!-- 空状态显示 -->
                        <div v-else class="empty-video-placeholder">
                            <el-icon class="big-icon">
                                <Monitor />
                            </el-icon>
                            <p>暂无正在播放的画面，请在左侧点击通道开启预览</p>
                        </div>
                    </div>
                </el-card>

            </el-main>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onBeforeUnmount } from 'vue'
import { VideoCamera, Search, Refresh, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// --- ⚙️ 模拟硬盘录像机（NVR）及关联通道的数据点点表 ---
interface Channel { id: string; name: string }
interface NVR { id: number; name: string; channels: Channel[] }

const nvrList = ref<NVR[]>([
    {
        id: 1,
        name: '🏢 1号仓主硬盘录像机',
        channels: [
            { id: '101', name: '1号仓东侧低位监控' },
            { id: '102', name: '1号仓西侧高位监控' },
            { id: '201', name: '2号仓全景球机' },
            { id: '301', name: '3号仓通道传感器绑定机' }
        ]
    },
    {
        id: 2,
        name: '🌾 2号储备库备份录像机',
        channels: [
            { id: '101', name: '储备库A区大门' },
            { id: '201', name: '储备库B区内部监测' }
        ]
    }
])

// 联动响应式状态
const activeNvrId = ref<number | null>(null)
const activeChannelId = ref<string | null>(null)
const isLive = ref<boolean>(true) // 当前是在看实时（true）还是回放（false）
const isSearching = ref<boolean>(false)
const renderKey = ref<number>(0) // 用于强制刷新画布销毁旧连接
const canvasRef = ref<HTMLCanvasElement | null>(null)
let playerInstance: any = null

const controls = reactive({
    start_time: ''
})

// 计算属性：左侧根据选中的 NVR 动态映射展示的所有通道 [INDEX]
const currentChannels = computed(() => {
    const found = nvrList.value.find(n => n.id === activeNvrId.value)
    return found ? found.channels : []
})

// 当切换选中的录像机时，清空当前激活的通道状态
const handleNvrChange = () => {
    destroyPlayer()
    activeChannelId.value = null
}

// 核心：点击通道时切换预览窗口（点击其他通道时旧实例销毁，新流直接覆盖）
const selectChannel = (chId: string) => {
    activeChannelId.value = chId
    isLive.value = true // 点击新通道，默认先展示实时
    controls.start_time = '' // 清空历史时间选择器

    // 核心：强行自增 renderKey 驱动组件刷新重连，达到覆盖画面的效果
    renderKey.value++

    nextTick(() => {
        initJSMpegPlayer()
    })
}

// 🔍 触发搜索历史回放
const handleSearchPlayback = async () => {
    if (!controls.start_time || !activeChannelId.value) return
    isSearching.value = true
    isLive.value = false // 切换状态至历史回放模式

    try {
        // 💡 转换为标准 ISO 字符串，并切割掉毫秒以满足海康及 FastAPI 格式要求
        const isoStr = new Date(controls.start_time).toISOString().split('.')[0] + 'Z'
        console.log('触发历史回放嗅探时间:', isoStr)

        renderKey.value++ // 重新刷新画布
        nextTick(() => {
            initJSMpegPlayer(isoStr)
        })

        ElMessage.success('历史回放通道建立成功')
    } catch (error) {
        ElMessage.error('回放读取失败')
    } finally {
        isSearching.value = false
    }
}

// 🔄 一键切回实时画面
const switchToLive = () => {
    isLive.value = true
    controls.start_time = ''
    renderKey.value++
    nextTick(() => {
        initJSMpegPlayer()
    })
    ElMessage.info('已切回实时预览状态')
}

// 🎬 核心函数：初始化 JSMpeg 播放管线
const initJSMpegPlayer = (playbackTime: string | null = null) => {
    destroyPlayer() // 连接前安全双重释放，绝对不留后台进程

    if (!canvasRef.value || !activeChannelId.value) return

    // 💡 根据状态动态决定走哪个 WebSocket 协议
    let socketUrl = `ws://localhost:8000/stream/live/${activeChannelId.value}`
    if (!isLive.value && playbackTime) {
        socketUrl = `ws://localhost:8000/stream/playback/${activeChannelId.value}?start_time=${playbackTime}`
    }

    const JSMpeg = (window as any).JSMpeg
    if (JSMpeg) {
        playerInstance = new JSMpeg.Player(socketUrl, {
            canvas: canvasRef.value,
            autoplay: true,
            audio: false,
            disableGl: true,     // 使用最稳健的 2D 绘图上下文防止死锁静止
            progressive: false,  // 禁用网络层渐进加载，防止卡在某一帧
            source: JSMpeg.Source.WebSocket, // 强制绕过任何 HTTP (HEAD/GET) 探测，防止 404/405
            onSourceEstablished: () => {
                console.log(`🎬 画面渲染引擎成功接入通道: ${activeChannelId.value}`)
            }
        })
        playerInstance.play()
    }
}

const destroyPlayer = () => {
    if (playerInstance) {
        playerInstance.destroy()
        playerInstance = null
    }
}

onBeforeUnmount(() => {
    destroyPlayer()
})
</script>

<style scoped>
.monitor-dashboard {
    height: 100vh;
    background-color: #f5f7fa;
}

.main-container {
    height: 100%;
}

.aside-menu {
    background-color: #fff;
    border-right: 1px solid #dcdfe6;
    display: flex;
    flex-direction: column;
}

.aside-header {
    padding: 18px;
    font-size: 15px;
    font-weight: bold;
    background-color: #409eff;
    color: #fff;
}

.nvr-selector-box {
    padding: 15px;
    border-bottom: 1px solid #f2f6fc;
}

.nvr-selector-box .label {
    font-size: 13px;
    color: #606266;
    display: block;
    margin-bottom: 8px;
}

.channel-list-box {
    padding: 15px;
    flex: 1;
    overflow-y: auto;
}

.channel-list-box .sub-title {
    font-size: 13px;
    font-weight: bold;
    color: #909399;
    margin-bottom: 12px;
}

.channel-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 6px;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.channel-item:hover {
    background-color: #f5f7fa;
}

.channel-item.is-active {
    background-color: #ecf5ff;
    border-color: #b3d8ff;
    color: #409eff;
}

.icon-camera {
    margin-right: 10px;
    font-size: 16px;
}

.channel-name {
    font-size: 13px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.content-main {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.controls-wrapper {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
}

.ctrl-label {
    font-size: 13px;
    color: #606266;
}

.btn-group {
    display: flex;
    gap: 10px;
}

.status-badge {
    margin-left: auto;
}

.video-container-card {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1a;
    border-radius: 8px;
}

.video-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.video-canvas {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.empty-video-placeholder {
    text-align: center;
    color: #909399;
    padding: 60px 0;
}

.empty-video-placeholder .big-icon {
    font-size: 48px;
    margin-bottom: 12px;
}
</style>
