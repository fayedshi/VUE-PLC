<template>
  <div class="window-container">
    <div ref="canvasContainer" class="canvas-container"></div>

    <div class="control-btn-group alignment-center">
      <el-button type="success" :icon="VideoPlay" @click="controlWindow('open')">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="controlWindow('close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="controlWindow('stop')">停止</el-button>
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
let windowGroup = null // 运动组

// 窗户状态控制
const windowState = ref('closed') 
const currentAngle = ref(0)     
// 翻窗的打开角度通常不需要 90 度，这里设为 45 度 (Math.PI / 4) 看起来最自然，你可以根据需要调整
const maxAngle = Math.PI / 2 
const speed = 0.005 // 翻转速度调慢一点，更平滑

const controlWindow = (action) => {
  if (!windowGroup) return
  if (action === 'open') {
    if (windowState.value !== 'open') windowState.value = 'opening'
  } else if (action === 'close') {
    if (windowState.value !== 'closed') windowState.value = 'closing'
  } else if (action === 'stop') {
    windowState.value = 'stopped'
  }
}

const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / 500, 0.1, 1000)
  camera.position.set(-12, -12, -12) 

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, 500)
  canvasContainer.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(20, 40, 20)
  scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()
  
  windowGroup = new THREE.Group()
  scene.add(windowGroup)

  loader.load('/asset/Window_AnimatedV1.fbx', (fbxObject) => {
    fbxObject.scale.set(0.09, 0.09, 0.09)
    scene.add(fbxObject)

    const movingParts = []
    let baseUpperMesh = null
    let baseLowerMesh = null
    
    fbxObject.traverse((child) => {
      if (child.isMesh) {
        console.log('发现窗户部件:', child.name)

        // 收集需要动的部件
        if (
          [
            'Window_Animated_BaseUpper_V1',
            // 'Window_Animated_V1',
            'Window_Animated_Handle_V1',
            // 'Window_Animated_BaseLower_V1'
          ].includes(child.name)
        ) {
          movingParts.push(child)
        }

      }
    })

    // 将运动部件安全吸附到运动组
    movingParts.forEach((part) => {
      windowGroup.attach(part)
    })

    // 【关键：动态修正翻转轴心点】
    // 默认通过计算移动部件的包围盒，找到它的几何中心
    const box = new THREE.Box3().setFromObject(windowGroup)
    const center = box.getCenter(new THREE.Vector3())
    
    // 情况 A：如果是“上悬窗”（绕着上边框转）
    // 轴心应该设在包围盒的顶部：Y轴设为 box.max.y
    windowGroup.position.set(center.x, box.max.y, center.z)
    
    // 情况 B：如果是“下悬窗”（绕着下边框转）
    // 如果是下翻，请取消注释下面这行，并注释掉上面的情况 A
    // windowGroup.position.set(center.x, box.min.y, center.z)

    // 改变了父容器 windowGroup 的位置后，需要把里面的子部件往反方向挪动相同距离，
    // 这样窗户在视觉上才不会发生瞬间位移，且旋转中心成功移到了边缘
    movingParts.forEach((part) => {
      part.position.x -= windowGroup.position.x
      part.position.y -= windowGroup.position.y
      part.position.z -= windowGroup.position.z
    })

    // 相机自动聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    controls.target.copy(fullBox.getCenter(new THREE.Vector3()))
    
  }, undefined, (error) => {
    console.error('FBX 模型加载失败:', error)
  })
}

// 动画渲染帧循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  if (windowGroup) {
    if (windowState.value === 'opening') {
      currentAngle.value += speed
      if (currentAngle.value >= maxAngle) {
        currentAngle.value = maxAngle
        windowState.value = 'open'
      }
    } else if (windowState.value === 'closing') {
      currentAngle.value -= speed
      if (currentAngle.value <= 0) {
        currentAngle.value = 0
        windowState.value = 'closed'
      }
    }

    // 核心修改：控制绕 X 轴旋转（实现上下翻转动作）
    windowGroup.rotation.x = currentAngle.value
  }

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
  max-width: 800px;
  margin: 0 auto;
}
.canvas-container {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
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
