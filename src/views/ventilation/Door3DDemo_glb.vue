<template>
  <div class="door-container">
    <!-- 3D 渲染画布载体 -->
    <div ref="canvasContainer" class="canvas-container"></div>

    <!-- 交互控制区域（放中间） -->
    <div class="control-btn-group alignment-center">
      <el-button type="success" :icon="VideoPlay" @click="controlDoor('open')">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="controlDoor('close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="controlDoor('stop')">停止</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// HTML 元素引用
const canvasContainer = ref(null)

// 3D 相关变量（非响应式，避免 Vue 劫持大对象导致卡顿）
let scene, camera, renderer, controls, animationFrameId
let doorGroup = null // 关键：用来装载所有旋转部件的容器

// 门的状态控制
const doorState = ref('closed') // 'open' | 'opening' | 'closed' | 'closing' | 'stopped'
const currentAngle = ref(0)     // 当前旋转角度（弧度）
const maxAngle = Math.PI / 2    // 最大开门角度：90度 (约 1.57 弧度)
const speed = 0.02              // 开关门速度

// 按钮点击控制
const controlDoor = (action) => {
  if (!doorGroup) return // 模型未加载完毕时不可控制

  if (action === 'open') {
    if (doorState.value !== 'open') doorState.value = 'opening'
  } else if (action === 'close') {
    if (doorState.value !== 'closed') doorState.value = 'closing'
  } else if (action === 'stop') {
    doorState.value = 'stopped'
  }
}

// 初始化 3D 环境
const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / 500, 0.1, 1000)
  camera.position.set(3, 3, 5) // 根据模型大小调整相机初始位置

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, 500)
  renderer.shadowMap.enabled = true // 开启阴影支持（可选）
  canvasContainer.value.appendChild(renderer.domElement)

  // 基础光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 5)
  scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true // 缓动效果

  // 实例化加载器并载入你的 3D 模型
  loadDoorModel()

  animate()
}

// 加载模型并对 8 个部件进行重新编组
const loadDoorModel = () => {
  const loader = new GLTFLoader()

  // 创建我们自定义的旋转父容器
  doorGroup = new THREE.Group()
  scene.add(doorGroup)

  // 这里的路径请替换为你项目中实际的模型存放路径（通常放 public 目录下）
  // loader.load('/asset/Window+W01+by+Dubyk.glb', (gltf) => {
  loader.load('/asset/Door.glb', (gltf) => {
    const model = gltf.scene
    scene.add(model)

    // 存储需要旋转的部件引用
    const movingParts = []

    // 遍历模型中的所有网格，根据名字找部件
    model.traverse((child) => {
      if (child.isMesh) {
        // 打印所有发现的部件名，方便调试（看大小写是否一致）
        console.log('发现模型部件:', child.name)

        // 判断是否属于开门时需要移动的部件
        if (
          [
            // 'wing_01',
            // 'wing_01_1',
            // 'wing_01_2',
            // 'wing_01_3',
            // 'wing_01_4',
            // 'wing_02',
            // 'wing_02_1',
            // 'wing_02_2',
            // 'wing_02_3',
            // 'wing_02_4',

            'Plane009',
            'Plane009_1',
            // 'Handles',
            // 'Key_Hole_1',
            // 'Key_Hole_2',
            // 'Frame',
            // 'Hinge_1',
            // 'Hinge_2',
            // 'Hinge_3',
          ].includes(child.name)
        ) {
          movingParts.push(child)
        }
        // 其余部件如 Plane009(门框)、Hinge_1/2/3(合页) 保持原样留在 model 里即可
      }
    })

    // 【核心操作】将需要移动的部件移入 doorGroup
    // 注意：在 Three.js 中，将一个物体 add 到新 Group 时，它会自动从原父级脱离
    movingParts.forEach((part) => {
      // 保持物体在世界坐标系中的位置和姿态不变（防止移入新组后坐标错乱）
      doorGroup.attach(part)
    })

    // 【修正旋转轴心】
    // 默认情况下，doorGroup 的中心在 (0,0,0)。如果你的模型合页正好在场景原点，下面这两句不需要。
    // 如果发现门是绕着中间转的，就需要将 doorGroup 移到合页的位置，同时把里面的子部件往反方向移（即设置轴心偏移）。
    // 假设根据模型观察，合页位于 X 轴的 -0.5 位置：
    // doorGroup.position.set(-0.5, 0, 0)
    // movingParts.forEach(part => part.position.x += 0.5)

  }, undefined, (error) => {
    console.error('模型加载失败:', error)
  })
}

// 渲染与动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 状态机处理旋转角度
  if (doorGroup) {
    if (doorState.value === 'opening') {
      currentAngle.value += speed
      if (currentAngle.value >= maxAngle) {
        currentAngle.value = maxAngle
        doorState.value = 'open'
      }
    } else if (doorState.value === 'closing') {
      currentAngle.value -= speed
      if (currentAngle.value <= 0) {
        currentAngle.value = 0
        doorState.value = 'closed'
      }
    }
    // 'stopped' 状态下不更新角度，即实现【暂停】

    // 应用 Y 轴旋转（开门通常是绕垂直的 Y 轴旋转）
    doorGroup.rotation.y = currentAngle.value
  }

  controls.update()
  renderer.render(scene, camera)
}

// 响应式画布缩放
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
.door-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.canvas-container {
  width: 100%;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 按钮居中样式 */
.control-btn-group {
  display: flex;
  gap: 16px;
  padding: 20px 0;
}

.alignment-center {
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>
