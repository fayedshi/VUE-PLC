<template>
  <div class="window-container">
    <div ref="canvasContainer" class="canvas-container"></div>

    <!-- 顶层全局控制按钮 -->
    <div class="control-btn-group alignment-center全局">
      <el-button type="primary" @click="controlAllWindows('open')">全部开启</el-button>
      <el-button type="info" @click="controlAllWindows('close')">全部关闭</el-button>
    </div>

    <!-- 每个窗户的独立控制面板 -->
    <div class="individual-controls">
      <div v-for="(win, index) in windowsList" :key="index" class="control-item">
        <span>窗户 #{{ index + 1 }}：</span>
        <el-button-group>
          <el-button size="small" type="success" :icon="VideoPlay" @click="controlWindow(index, 'open')">开启</el-button>
          <el-button size="small" type="danger" :icon="SwitchButton"
            @click="controlWindow(index, 'close')">关闭</el-button>
          <el-button size="small" type="warning" :icon="VideoPause" @click="controlWindow(index, 'stop')">停止</el-button>
        </el-button-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const canvasContainer = ref(null)

let scene, camera, renderer, controls, animationFrameId

// 1. 定义需要加载的窗户数量与配置
const WINDOW_COUNT = 3
const WINDOW_SPACING = 40 // 窗户之间的间距（根据模型大小调整）

// 2. 用响应式数组存储所有窗户的状态和引用
const windowsList = ref([])

const maxAngle = Math.PI / 2
const speed = 0.02

// 单个窗户控制
const controlWindow = (index, action) => {
  const win = windowsList.value[index]
  if (!win || !win.group) return

  if (action === 'open') {
    if (win.state !== 'open') win.state = 'opening'
  } else if (action === 'close') {
    if (win.state !== 'closed') win.state = 'closing'
  } else if (action === 'stop') {
    win.state = 'stopped'
  }
}

// 全部窗户一键控制
const controlAllWindows = (action) => {
  windowsList.value.forEach((_, index) => {
    controlWindow(index, action)
  })
}

const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / 500, 0.1, 10000)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, 500)
  canvasContainer.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(5, 20, 15)
  scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enableZoom = false     // 允许多窗户时缩放观察
  controls.enablePan = false      // 允许平移
  controls.enableRotate = false

  // 循环加载多个窗户
  loadMultipleWindows()
  animate()
}

const loadMultipleWindows = () => {
  const loader = new FBXLoader()

  for (let i = 0; i < WINDOW_COUNT; i++) {
    // 3. 为每个窗户初始化状态数据并推入数组
    const windowData = {
      group: new THREE.Group(), // 每个窗户独立的旋转动画组
      state: 'closed',
      currentAngle: 0
    }
    windowsList.value.push(windowData)
    scene.add(windowData.group)

    loader.load('/asset/windows.fbx', (fbxObject) => {
      const size = 0.14
      fbxObject.scale.set(size, size, size)
      fbxObject.rotation.y = Math.PI / 2

      // 4. 【关键】计算每个窗户在场景中的基础位移（排成一排）
      // 让整体居中：第i个窗户的X坐标 = (i - 中间索引) * 间距
      const offsetX = (i - (WINDOW_COUNT - 1) / 2) * WINDOW_SPACING
      fbxObject.position.x = offsetX
      scene.add(fbxObject)

      const movingParts = []

      fbxObject.traverse((child) => {
        if (child.isMesh) {
          if (
            [
              'v', 'v2', '0_2', '2', 'BT_DLSZD_03',
              'BT_RJCHY_01_02', 'BT_RJCHY_01_02_instance'
            ].includes(child.name)
          ) {
            movingParts.push(child)
          }
        }
      })

      // 将运动部件安全吸附到该窗户自己的运动组中
      movingParts.forEach((part) => {
        windowData.group.attach(part)
      })

      // 5. 动态修正每个窗户单独的翻转轴心点
      const box = new THREE.Box3().setFromObject(windowData.group)

      // 注意：轴心点坐标需要加上 offsetX 偏移量
      windowData.group.position.set(box.min.x, box.min.y, box.min.z)

      // 子部件反向挪动距离，保持相对位置
      movingParts.forEach((part) => {
        part.position.x -= windowData.group.position.x
        part.position.y -= windowData.group.position.y
        part.position.z -= windowData.group.position.z
      })

      // 6. 当最后一个模型加载完，让相机对准整排窗户的中心位置
      if (i === WINDOW_COUNT - 1) {
        const fullBox = new THREE.Box3().setFromObject(scene)
        const sceneCenter = fullBox.getCenter(new THREE.Vector3())
        const modelHeight = fullBox.max.y - fullBox.min.y
        console.log('modelHeight: ', modelHeight)
        controls.target.set(sceneCenter.x, -20, sceneCenter.z)
        // controls.target.set(sceneCenter.x, sceneCenter.y - modelHeight * 0.8 , sceneCenter.z)
        // controls.target.copy(sceneCenter)
        camera.position.set(sceneCenter.x, sceneCenter.y - modelHeight * 0.8, sceneCenter.z + 120)
        controls.update()
      }

    }, undefined, (error) => {
      console.error(`FBX 模型窗户 #${i + 1} 加载失败:`, error)
    })
  }
}

// 动画渲染帧循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 7. 遍历数组，各自更新自己的动画状态
  windowsList.value.forEach((win) => {
    if (!win.group) return

    if (win.state === 'opening') {
      win.currentAngle += speed
      if (win.currentAngle >= maxAngle) {
        win.currentAngle = maxAngle
        win.state = 'open'
      }
    } else if (win.state === 'closing') {
      win.currentAngle -= speed
      if (win.currentAngle <= 0) {
        win.currentAngle = 0
        win.state = 'closed'
      }
    }

    // 应用各自的角度值
    win.group.rotation.y = -win.currentAngle
  })

  controls.update()
  renderer.render(scene, camera)
}

const handleResize = () => {
  if (!camera || !renderer || !canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  camera.aspect = width / 500
  camera.updateProjectionMatrix()
  renderer.setSize(width, 500)
}

onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.window-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.canvas-container {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.control-btn-group {
  display: flex;
  gap: 16px;
  padding: 15px 0;
  border-bottom: 1px solid #e2e8f0;
}

.individual-controls {
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 6px;
}

.alignment-center {
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>
