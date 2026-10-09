<template>
    <el-card class="video-card" shadow="hover">
        <template #header>
            <div class="video-header">
                <span>📹 仓位实时监控 (NVR通道-{{ channelId }})</span>
            </div>
        </template>

        <div class="video-wrapper">
            <!-- 原生 JSMpeg 只需给一个标准的 canvas 标签 -->
            <canvas ref="canvasRef" class="video-canvas"></canvas>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
    channelId: { type: String, default: '101' }
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let playerInstance: any = null
let socketInstance: WebSocket | null = null


onMounted(() => {
    // 1. 确保是标准的 ws:// 协议
    const socketUrl = `ws-api/stream/nvr/${props.channelId}`
    const httpStreamUrl = `http-api/stream/nvr/${props.channelId}`


    if (canvasRef.value) {
        const JSMpeg = (window as any).JSMpeg

        try {
            // 📢 1. 先建立原生的 WebSocket 连接
            socketInstance = new WebSocket(socketUrl)

            // 📢 2. 💡 JSMpeg 原生标准写法：直接把 socket 实例作为第一个参数传入！
            // 这样它内部会自动监听 onmessage 接收二进制流并实时绘制到 canvas 上
            playerInstance = new JSMpeg.Player(socketUrl, {
                canvas: canvasRef.value,
                autoplay: true,
                audio: false,
                source: JSMpeg.Source.WebSocket,
                disableGl: true,
                progressive: false,   // 关闭渐进缓存
                reconnectInterval: 5,
                onSourceEstablished: () => {
                    console.log(`🎬 Canvas 开始渲染 NVR 通道 ${props.channelId} 画面`)
                },
                onVideoDecode: () => {
                    // 💡 调试大招：如果控制台疯狂滚动打印这一行，说明前端解码完全正常！画面绝对出来了！
                    console.log(`🎬 通道 ${props.channelId} 正在实时成功解码视频帧...`)
                }
            })

            console.log(`📡 WebSocket 流管道已绑定到通道 ${props.channelId}`)
        } catch (err) {
            console.error("初始化播放器失败:", err)
        }
    }
})


onBeforeUnmount(() => {
    if (playerInstance) {
        playerInstance.destroy()
        playerInstance = null
        console.log(`⏹️ 通道 ${props.channelId} 视频资源安全释放`)
    }
})
</script>

<style scoped>
.video-card {
    border-radius: 8px;
    background-color: #1d1d1f;
    color: #fff;
}

.video-header {
    color: #333;
    font-weight: bold;
}

.video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-canvas {
    width: 100% !important;
    height: auto !important;
}
</style>
