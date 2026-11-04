<template>
  <div class="window-container">
    <div ref="canvasContainer" class="canvas-container"></div>

    <div class="control-btn-group alignment-center">窗 #1
      <el-button type="success" :icon="VideoPlay" @click="controlWindow(0, 'open')">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="controlWindow(0, 'close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="controlWindow(0, 'stop')">停止</el-button>
    </div>
    <div class="control-btn-group alignment-center">窗 #2
      <el-button type="success" :icon="VideoPlay" @click="controlWindow(1, 'open')">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="controlWindow(1, 'close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="controlWindow(1, 'stop')">停止</el-button>
    </div>


    <div class="control-btn-group alignment-center">
      <el-button type="success" :icon="VideoPlay" @click="handleBlowerChange(1)">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="handleBlowerChange('close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="handleBlowerChange(3)">停止</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const canvasContainer = ref(null) // 只有畫布 DOM 節點需要 ref 獲取元素

let scene, camera, renderer, controls, animationFrameId

// 旋轉配置
const maxAngle = Math.PI / 2
const speed = 0.02
let blowerBladeMesh = null
const isBlowerRunning = ref(false) // 風機狀態保留 ref 供業務邏輯聯動（若不需要也可改 let）

const group_0 = ['v', 'v2', '0_2', '2', 'BT_DLSZD_03', 'BT_RJCHY_01_02']
const group_1 = ['g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']

// 🎯 【核心修改】完全使用普通 JS 陣列與物件，Vue 碰不到它們，絕對不會有 Proxy 報錯
const windowList = [
  {
    id: 'window_1',
    state: 'closed',       // 'closed', 'opening', 'open', 'closing', 'stopped'
    currentAngle: 0,
    movingPartNames: group_0,
    group: null,           // 存放 THREE.Group
    realMeshList: []       // 存放真實 THREE.Mesh
  },
  {
    id: 'window_2',
    state: 'closed',
    currentAngle: 0,
    movingPartNames: group_1,
    group: null,
    realMeshList: []
  }
]

// 控制按鈕方法（直接操作普通 JS 物件）
const controlWindow = (index, action) => {
  const windowItem = windowList[index]
  if (action === 'open') {
    if (windowItem.state !== 'open') windowItem.state = 'opening'
  } else if (action === 'close') {
    if (windowItem.state !== 'closed') windowItem.state = 'closing'
  } else if (action === 'stop') {
    windowItem.state = 'stopped'
  }
}

function handleBlowerChange(status) {
  isBlowerRunning.value = status === 1
}

const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')

  camera = new THREE.PerspectiveCamera(45, canvasContainer.value.clientWidth / 500, 0.1, 10000)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, 500)
  canvasContainer.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()

  loader.load('/asset/1104_1.fbx', (fbxObject) => {
    const size = 0.2
    fbxObject.scale.set(size, size, size)
    scene.add(fbxObject)

    // 遍歷模型，把真實 Mesh 分配到普通陣列中
    fbxObject.traverse((child) => {
      if (child.isMesh) {
        windowList.forEach(windowItem => {
          if (windowItem.movingPartNames.includes(child.name)) {
            windowItem.realMeshList.push(child)
          }
        })

        if (child.name === 'fengshan') {
          blowerBladeMesh = child
          if (child.material) {
            child.material.side = THREE.DoubleSide
          }
        }
      }
    })

    // 計算軸心與群組建立
    windowList.forEach((windowItem) => {
      if (windowItem.realMeshList.length === 0) return

      const windowGroup = new THREE.Group()
      scene.add(windowGroup)

      // 計算真實包圍盒
      const tempGroup = new THREE.Group()
      windowItem.realMeshList.forEach(mesh => tempGroup.add(mesh.clone()))
      const box = new THREE.Box3().setFromObject(tempGroup)
      const center = box.getCenter(new THREE.Vector3())

      // 設置旋轉軸心位置
      windowGroup.position.set(center.x, box.min.y, center.z)

      // 移動真實 Mesh 並吸附
      windowItem.realMeshList.forEach((mesh) => {
        mesh.position.x -= windowGroup.position.x
        mesh.position.y -= windowGroup.position.y
        mesh.position.z -= windowGroup.position.z
        windowGroup.attach(mesh)
      })

      windowItem.group = windowGroup
    })

    // 相機聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    const modelCenter = fullBox.getCenter(new THREE.Vector3())
    controls.target.copy(modelCenter)
    camera.position.set(modelCenter.x - 60, modelCenter.y + 20, modelCenter.z + 60)
    controls.update()

  }, undefined, (error) => {
    console.error('FBX 模型加载失败:', error)
  })
}

let currentSpeed = 0
const maxSpeed = 0.12
const acceleration = 0.003

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 1. 窗戶動畫：高速渲染迴圈直接讀寫普通變數的屬性，效率最高
  windowList.forEach(windowItem => {
    if (windowItem.group) {
      if (windowItem.state === 'opening') {
        windowItem.currentAngle += speed
        if (windowItem.currentAngle >= maxAngle) {
          windowItem.currentAngle = maxAngle
          windowItem.state = 'open'
        }
      } else if (windowItem.state === 'closing') {
        windowItem.currentAngle -= speed
        if (windowItem.currentAngle <= 0) {
          windowItem.currentAngle = 0
          windowItem.state = 'closed'
        }
      }

      // 驅動 3D 群組旋轉
      windowItem.group.rotation.y = -windowItem.currentAngle
    }
  })

  // 2. 風扇動畫
  if (blowerBladeMesh) {
    if (isBlowerRunning.value) {
      if (currentSpeed < maxSpeed) currentSpeed += acceleration
    } else {
      if (currentSpeed > 0) currentSpeed -= acceleration
      if (currentSpeed < 0) currentSpeed = 0
    }
    blowerBladeMesh.rotation.x -= currentSpeed
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
  if (renderer) renderer.dispose()
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
