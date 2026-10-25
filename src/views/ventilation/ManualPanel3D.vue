<template>
    <WindowScene :windowStatus="currentStatus" />
    <div class="control-btn-group">

        <!-- 开启按钮：成功绿，带播放图标 -->
        <el-button type="success" @click="handleOpen">
            开启
        </el-button>

        <!-- 关闭按钮：危险红，带电源/关闭图标 -->
        <el-button type="danger"  @click="handleClose">
            关闭
        </el-button>

        <!-- 停止按钮：警告黄，带方形停止图标 -->
        <el-button type="warning"  @click="handleStop">
            停止
        </el-button>
    </div>

</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import WindowScene from '../../components/WindowScene.vue' // 引入你的 3D 子组件

// 需要从 element-plus 图标库中引入对应图标
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'

const handleOpen = () => {
    currentStatus.value=1
    console.log('触发：开启设备')
}

const handleClose = () => {
    currentStatus.value=2
    console.log('触发：关闭设备')
}

const handleStop = () => {
    console.log('触发：紧急停止')
}



const currentStatus = ref(0)
</script>
<style scoped>
.control-btn-group {
    /* margin: 0 auto; */
    display: flex;
    gap: 12px;
    /* 按钮之间的间距 */
    padding: 8px 0;
    justify-content: center;
    /* 水平居中 */
    align-items: center;
    /* 垂直居中 */
    width: 100%;
    /* 确保撑满父级宽度 */
}
</style>
