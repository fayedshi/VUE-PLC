<template>
    <div class="dashboard-container">
        <!-- 左侧 2D 控制台列表（引入 Tabs 标签页） -->
        <div class="sidebar-panel">
            <div class="panel-header">
                <h2>设备总控台</h2>
                <el-tag type="success">设备总数: {{ devices.length }}</el-tag>
            </div>

            <!-- v-model 绑定当前选中的标签页 -->
            <el-tabs v-model="activeTab" class="device-tabs" stretch>
                <!-- 窗体分类 -->
                <el-tab-pane name="window">
                    <template #label>
                        <span>🪟 窗 ({{ windowsList.length }})</span>
                    </template>
                    <el-scrollbar class="device-scroll-list">
                        <div v-if="windowsList.length === 0" class="empty-text">暂无窗体设备</div>
                        <div v-for="device in windowsList" :key="device.id"
                            :class="['device-card', { 'is-active': activeDeviceId === device.id }]"
                            @click="focusDevice(device)">
                            <div class="card-info">
                                <span class="device-name">{{ device.name }}</span>
                                <el-tag :type="getStatusTagType(device.state)" size="small">
                                    {{ getStatusText(device.state) }}
                                </el-tag>
                            </div>
                            <div class="card-actions" @click.stop>
                                <el-button type="primary" size="small"
                                    :disabled="['open', 'opening'].includes(device.state)"
                                    @click="controlWindow(device, 'open')">开启</el-button>
                                <el-button type="danger" size="small"
                                    :disabled="['closed', 'closing'].includes(device.state)"
                                    @click="controlWindow(device, 'close')">关闭</el-button>
                                <el-button type="info" size="small"
                                    :disabled="['open', 'closed', 'stopped'].includes(device.state)"
                                    @click="controlWindow(device, 'stop')">停止</el-button>
                            </div>
                        </div>
                    </el-scrollbar>
                </el-tab-pane>

                <!-- 风机/风扇分类 -->
                <el-tab-pane name="fan">
                    <template #label>
                        <span>✇ 风机 ({{ blowerList.length }})</span>
                    </template>
                    <el-scrollbar class="device-scroll-list">
                        <div v-if="blowerList.length === 0" class="empty-text">暂无风机设备</div>
                        <div v-for="device in blowerList" :key="device.id"
                            :class="['device-card', { 'is-active': activeDeviceId === device.id }]"
                            @click="focusDevice(device)">
                            <div class="card-info">
                                <span class="device-name">{{ device.name }}</span>
                                <el-tag :type="getStatusTagType(device.state)" size="small">
                                    {{ getStatusText(device.state) }}
                                </el-tag>
                            </div>
                            <div class="card-actions" @click.stop>
                                <el-button type="primary" size="small"
                                    :disabled="['open', 'opening'].includes(device.state)"
                                    @click="controlWindow(device, 'open')">开启</el-button>
                                <el-button type="danger" size="small"
                                    :disabled="['closed', 'closing'].includes(device.state)"
                                    @click="controlWindow(device, 'close')">关闭</el-button>
                                <el-button type="info" size="small"
                                    :disabled="['open', 'closed', 'stopped'].includes(device.state)"
                                    @click="controlWindow(device, 'stop')">停止</el-button>
                            </div>
                        </div>
                    </el-scrollbar>
                </el-tab-pane>

                <!-- 空调分类 -->
                <el-tab-pane name="ac">
                    <template #label>
                        <span>❄️ 空调 ({{ acList.length }})</span>
                    </template>
                    <el-scrollbar class="device-scroll-list">
                        <div v-if="acList.length === 0" class="empty-text">暂无空调设备</div>
                        <div v-for="device in acList" :key="device.id"
                            :class="['device-card', { 'is-active': activeDeviceId === device.id }]"
                            @click="focusDevice(device)">
                            <div class="card-info">
                                <span class="device-name">{{ device.name }}</span>
                                <el-tag :type="getStatusTagType(device.state)" size="small">
                                    {{ getStatusText(device.state) }}
                                </el-tag>
                            </div>
                            <div class="card-actions" @click.stop>
                                <el-button type="primary" size="small"
                                    :disabled="['open', 'opening'].includes(device.state)"
                                    @click="controlWindow(device, 'open')">开启</el-button>
                                <el-button type="danger" size="small"
                                    :disabled="['closed', 'closing'].includes(device.state)"
                                    @click="controlWindow(device, 'close')">关闭</el-button>
                                <el-button type="info" size="small"
                                    :disabled="['open', 'closed', 'stopped'].includes(device.state)"
                                    @click="controlWindow(device, 'stop')">停止</el-button>
                            </div>
                        </div>
                    </el-scrollbar>
                </el-tab-pane>
            </el-tabs>
        </div>

        <!-- 右侧唯一的 3D 可视化大屏 -->
        <div class="three-viewport" ref="canvasContainer">
            <el-button class="reset-btn" type="warning" round v-show="activeDeviceId !== null" @click="resetCamera">
                返回厂盘全景
            </el-button>
        </div>
    </div>
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import gsap from 'gsap' // 引入用于镜头过渡的动画库
import http from '../../../api/http'

// 1. 响应式状态管理
const canvasContainer = ref(null)
const activeDeviceId = ref(null)
const selectedHouseCode = ref('001');

const granConfig = ref({})

const getDevLen = (devCate) => {
    let start = granConfig.value?.[devCate]?.[0]
    // console.log('start: ', start)
    if (!start) {
        console.log('returning 0')
        return 0
    }
    let end = granConfig.value?.[devCate][1]
    // console.log('dev len: ', end - start + 1)
    return end - start + 1
}

// 1. 默认选中的标签页
const activeTab = ref('window')

// 2. 模拟或你原本的全局设备列表（保持不变）
// const devices = reactive([
//     { id: 1, name: '1号排风窗', type: 'window', state: 'closed' },
//     { id: 2, name: '2号主风机', type: 'fan', state: 'open' },
//     { id: 3, name: '前台大厅空调', type: 'ac', state: 'stopped' },
// ])


// 20 个物理设备的数据模型
const devices = reactive([])

// 3. 计算属性：分类过滤列表
const windowsList = computed(() => devices.filter(d => d.type == 'windows'))
const blowerList = computed(() => devices.filter(d => d.type == 'blowers'))
const acList = computed(() => devices.filter(d => d.type == 'ac'))


// 3. Three.js 核心全局变量
let scene, camera, renderer, controls, animationFrameId
const maxAngle = Math.PI / 2  // 开窗最大角度限制 (45度)
const speed = 0.015           // 旋转动画速度

// 矩阵排布参数（4行 × 5列）
const ROWS = 4
const COLS = 5
const SPACING_X = 20          // 窗户之间的横向间距
const SPACING_Y = 20          // 窗户之间的纵向间距

// 2D 列表辅助函数
const getStatusText = (state) => {
    const map = { closed: '已关闭', opening: '正在开启', open: '已开启', closing: '正在关闭', stopped: '已暂停' }
    return map[state] || '未知'
}
const getStatusTagType = (state) => {
    const map = { closed: 'info', opening: 'warning', open: 'success', closing: 'warning', stopped: 'danger' }
    return map[state] || 'info'
}

// 2D 控制按钮交互
const controlWindow = (device, action) => {
    if (action === 'open' && device.state !== 'open') device.state = 'opening'
    if (action === 'close' && device.state !== 'closed') device.state = 'closing'
    if (action === 'stop') device.state = 'stopped'
}

const initGranConfig = async () => {
    // loading.value = true
    // console.log('in fetchGranaryList')
    try {
        // 💡 动态将前端的输入框内容拼接到 URL 的参数中 (Query Parameters)
        const response = await http.get(`http-api/api/dev-address/${selectedHouseCode.value}`)
        // 将后端返回的 MySQL 字典列表直接赋给组件变量
        granConfig.value = response.data
        // windowList.value= Array.from({ length: devSize.value }, (_, i) => ({ id: `windows-${i + granConfig.value['windows'][0]}`, name: `窗 ${i + 1}`, status: 4 }))
        // damperList.value= Array.from({ length: 8 }, (_, i) => ({ id: `damper-${i + granConfig.value['dampers'][0]}`, name: `风机 ${i + 1}`, status: 0 }))
        // blowerList.value= Array.from({ length: 8 }, (_, i) => ({ id: `fan-${i + 19}`, name: `风机 ${i + 1}`, status: 0 }))
        console.log('gran config: ', granConfig.value)



        Object.keys(granConfig.value['states']).forEach(key => {
            // if (key.startsWith('valve_') || key.startsWith('blower_') || ['id', 'mode_name', 'create_time', 'update_time'].includes(key)) {
            //     delete result[key]
            // }
            let groupDevices = Array.from({ length: getDevLen(key) }, (_, i) => ({
                id: key + '-' + (i + 1),
                type: key,
                // name: `通风窗设备 #${String(i + 1).padStart(2, '0')}`,
                name: `设备 #${String(i + 1).padStart(2, '0')}`,
                state: 'closed',          // closed, opening, open, closing, stopped
                currentAngle: 0,          // 独立的当前开合角度
                position3D: new THREE.Vector3(), // 记录它在3D空间中的位置，供镜头追踪使用
                windowGroupInstance: null // 存储该部件 3D 运动组的引用
            }))
            let deviceObj = null
            for (let i = 0; i < getDevLen(key); i++) {
                deviceObj = {
                    id: key + '-' + (i + 1),
                    type: key,
                    // name: `通风窗设备 #${String(i + 1).padStart(2, '0')}`,
                    name: `${key} #${String(i + 1).padStart(2, '0')}`,
                    state: 'closed',          // closed, opening, open, closing, stopped
                    currentAngle: 0,          // 独立的当前开合角度
                    position3D: new THREE.Vector3(), // 记录它在3D空间中的位置，供镜头追踪使用
                    windowGroupInstance: null // 存储该部件 3D 运动组的引用
                }
                devices.push(deviceObj)
            }
        })
        console.log('devices loaded ', devices)
        // categories.value.forEach((cate) => {
        //     // cate.devices=Array.from({ length: getDevLen(cate.type) }, (_, i) => ({ id: `${cate.type}-${i + granConfig.value[cate.type][0]}`, name: `${cate.label}#${i + 1}`, status: 4 }))
        //     if (granConfig.value[cate.type]) {
        //         cate.devices = Array.from({ length: getDevLen(cate.type) }, (_, i) => ({ id: `${cate.type}-${i + 1}`, name: `${cate.label}#${i + 1}`, status: 4 }))
        //     }
        // })

        // numWindows.value = granConfig.value['windows']
    } catch (error) {
        console.error('❌ 请求后端接口失败:', error)
        alert('数据加载失败，请检查后端服务是否启动！')
    } finally {

    }
}
// 初始化 3D 渲染宇宙
const initThree = () => {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#f1f5f9')

    // 设置一个能鸟瞰全局矩阵的安全大相机视锥
    camera = new THREE.PerspectiveCamera(45, canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 0.1, 5000)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
    canvasContainer.value.appendChild(renderer.domElement)

    // 基础标准灯光配置
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(50, 100, 80)
    scene.add(dirLight)

    // 初始化轨道控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // 批量生成排布这 20 个设备
    console.log('loading devices')
    loadAllDevices()

    // 启动统一渲染高频帧循环
    animate()
}

// 核心加载逻辑：在同一个大 Scene 里整齐平铺 20 个模型
const loadAllDevices = () => {
    console.log('loadAllDevices:', devices)
    const loader = new FBXLoader()

    devices.forEach((device, index) => {
        console.log('dev type:', device.type)
        if (['windows'].includes(device.type)) {

            console.log('single device:', device)
            // 自动计算矩阵队列中的行与列坐标
            const r = Math.floor(index / COLS)
            const c = index % COLS

            // 计算当前设备应该摆放的 3D 空间坐标位置 (以矩阵中心做一定的居中偏移)
            const posX = (c - (COLS - 1) / 2) * SPACING_X
            const posY = ((ROWS - 1) / 2 - r) * SPACING_Y
            const posZ = 0

            // 保存坐标到 Vue 响应式数据，后续提供给镜头追踪飞行导航使用
            device.position3D.set(posX, posY, posZ)
            // if (device.type == 'window') {
            loadSingleModel(loader, device, index)
            // }
        }
    })
}


const loadSingleModel = (loader, device, index) => {
    console.log('before added moving parts')
    loader.load(`/asset/${device.type}.fbx`, (fbxObject) => {
        const size = 0.11
        fbxObject.scale.set(size, size, size)
        fbxObject.rotation.y = Math.PI / 2
        scene.add(fbxObject)
        console.log('added moving parts')
        // 为这个设备单独配置一个合页旋转运动组
        const devGroup = new THREE.Group()
        scene.add(devGroup)

        const movingParts = []
        fbxObject.traverse((child) => {
            if (child.isMesh) {
                // 根据你之前找出的运动网格名称进行安全吸附收集
                if (['v', 'v2', '0_2', '2', 'BT_DLSZD_03', 'BT_RJCHY_01_02'].includes(child.name)) {
                    movingParts.push(child)
                }
            }
        })

        // 运动部件吸附进组
        movingParts.forEach(part => devGroup.attach(part))

        // 修正当前窗户的独立合页轴心点位置 (这里以你算出来的包围盒外边缘为例)
        const box = new THREE.Box3().setFromObject(devGroup)
        const center = box.getCenter(new THREE.Vector3())

        // 设定旋转点
        devGroup.position.set(box.min.x, box.min.y, box.min.z)

        movingParts.forEach((part) => {
            part.position.x -= devGroup.position.x
            part.position.y -= devGroup.position.y
            part.position.z -= devGroup.position.z
        })

        // 【大布局关键改动】：把修正好轴心的设备整体平移到它在矩阵中的专属物理排布坐标上
        devGroup.position.add(device.position3D)
        fbxObject.position.add(device.position3D)

        // 💾 保存创建好的 3D 运动实例引用到数组，供全局帧渲染控制它的开关状态
        device.windowGroupInstance = devGroup

        // 当最后一个模型加载完成后，让相机完美鸟瞰整个 4×5 的设备网格
        if (index === 8 - 1) {
            // resetCamera()
            const fullBox = new THREE.Box3().setFromObject(scene)
            const sceneCenter = fullBox.getCenter(new THREE.Vector3())
            const topLeft = new THREE.Vector3(
                fullBox.max.x,                  // X 轴最小 = 最左
                fullBox.min.y,                  // Y 轴最大 = 最上
                (fullBox.min.z) // Z 轴取中心（也可以根据需求直接用 fullBox.max.z 顶面最前）
            );
            const modelHeight = fullBox.max.y - fullBox.min.y
            console.log('topLeft: ', topLeft)
            // controls.target.set(sceneCenter.x, 10, sceneCenter.z)
            controls.target.set(180, 0, topLeft.z)
            // controls.target.set(sceneCenter.x, sceneCenter.y - modelHeight * 0.8 , sceneCenter.z)
            // controls.target.copy(sceneCenter)
            // camera.position.set(sceneCenter.x, sceneCenter.y - modelHeight * 0.8, sceneCenter.z + 120)
            // camera.position.set(sceneCenter.x-60, sceneCenter.y , sceneCenter.z )
            camera.position.set(sceneCenter.x, sceneCenter.y, sceneCenter.z + 120)
            controls.update()
        }

    }, undefined, (error) => {
        console.error(`${device.name} 模型加载失败:`, error)
    })
}

// 统一动力学动画帧循环
const animate = () => {
    animationFrameId = requestAnimationFrame(animate)

    // 遍历 20 个设备的数据大盘，做差异化动画更新
    devices.forEach((device) => {
        // 若未加载完成或处于静止态则直接跳过，降低运算开销
        if (!device.windowGroupInstance || ['closed', 'open', 'stopped'].includes(device.state)) return

        if (device.state === 'opening') {
            device.currentAngle += speed
            if (device.currentAngle >= maxAngle) {
                device.currentAngle = maxAngle
                device.state = 'open'
            }
        } else if (device.state === 'closing') {
            device.currentAngle -= speed
            if (device.currentAngle <= 0) {
                device.currentAngle = 0
                device.state = 'closed'
            }
        }

        // 精准控制当前单体设备的旋转（如：绕 Y 轴向外翻转开窗）
        device.windowGroupInstance.rotation.y = -device.currentAngle
    })

    controls.update()
    renderer.render(scene, camera)
}

// ✈️ 镜头联动技术：点击左侧列表卡片，镜头丝滑飞过去对准该窗户
const focusDevice = (device) => {
    activeDeviceId.value = device.id

    // 停止用户当前的鼠标拖拽控制
    controls.enabled = false

    // 1. 让控制器的聚焦靶心平滑平移到该模型的 3D 坐标中心
    gsap.to(controls.target, {
        x: device.position3D.x,
        y: device.position3D.y,
        z: device.position3D.z,
        duration: 1.2,
        ease: 'power2.out'
    })

    // 2. 将相机镜头挪动到一个近距离的精致观赏特写夹角 (比如稍微错开 25 个单位)
    gsap.to(camera.position, {
        x: device.position3D.x + 15,
        y: device.position3D.y + 15,
        z: device.position3D.z + 30,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
            controls.enabled = true // 飞行结束后恢复用户的鼠标拖动权限
        }
    })
}

// 🌍 视角复位：回到能一眼看清全厂 20 个设备的宏观上帝视角
const resetCamera = () => {
    activeDeviceId.value = null
    controls.enabled = false

    // 靶心回原点（整个矩阵的正中央）
    gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.0, ease: 'power2.out' })

    // 相机拉远到宏观高空
    gsap.to(camera.position, {
        x: 30,
        y: 40,
        z: 120,
        duration: 1.0,
        ease: 'power2.out',
        onComplete: () => {
            controls.enabled = true
        }
    })
}

// 适配大屏缩放
const handleResize = () => {
    if (!camera || !renderer || !canvasContainer.value) return
    const width = canvasContainer.value.clientWidth
    const height = canvasContainer.value.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
}

onMounted(async () => {
    await initGranConfig()
    console.log('init gran config done')
    initThree()
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId)
    window.removeEventListener('resize', handleResize)
    if (renderer) renderer.dispose()
})
</script>

<style scoped>
/* 撑满全屏的整体大容器布局 */
.dashboard-container {
    display: flex;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 左侧 2D 控制台面板样式 */
.sidebar-panel {
    width: 380px;
    height: 100%;
    background-color: #ffffff;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    z-index: 10;
}

.panel-header {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-header h2 {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
}

.device-scroll-list {
    flex: 1;
    padding: 15px;
}

/* 每一个设备的独立操作卡片组件 */
.device-card {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.25s ease;
}

.device-card:hover {
    border-color: #3b82f6;
    background-color: #f0f7ff;
    transform: translateY(-2px);
}

/* 当前被相机聚焦的卡片高亮显现 */
.device-card.is-active {
    border-color: #3b82f6;
    background-color: #e0f2fe;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.card-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.device-name {
    font-weight: 600;
    color: #334155;
    font-size: 14px;
}

.card-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

/* 右侧 3D 可视化大视窗 */
.three-viewport {
    flex: 1;
    height: 100%;
    position: relative;
}

/* 浮动的复位按钮 */
.reset-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
}
</style>