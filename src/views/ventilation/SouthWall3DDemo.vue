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
// import { groupData } from 'echarts/types/src/util/model.js'

const canvasContainer = ref(null)

let scene, camera, renderer, controls, animationFrameId
// let windowGroup = null // 运动组
let windowGroups = null // 运动组s

// 窗户状态控制
const windowState = ref('closed')
// const currentAngle = ref(0)
// 翻窗的打开角度通常不需要 90 度，这里设为 45 度 (Math.PI / 4) 看起来最自然，你可以根据需要调整
const maxAngle = Math.PI / 2
const speed = 0.02 // 翻转速度调慢一点，更平滑

let blowerBladeMesh = null
const isBlowerRunning = ref(false)

const group_0 = ['v',
  'v2',
  '0_2',
  '2',
  'BT_DLSZD_03',
  'BT_RJCHY_01_02']
const group_1 = ['g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']

const windowsList = ref([
  {
    id: 'window_1',
    group: null,            // 绑定对应的 Three.js Group 模型对象
    state: 'closed',       // 'closed', 'opening', 'open', 'closing'
    currentAngle: 0,
    maxAngle: Math.PI / 2, // 每个窗户甚至可以有不同的开窗最大角度
    speed: 0.02,
    movingParts: group_0
  },
  {
    id: 'window_2',
    group: null,
    state: 'closed',
    currentAngle: 0,
    maxAngle: Math.PI / 2,
    speed: 0.02,
    movingParts: group_1
  }
  // 可以根据需要继续添加 window_3, window_4 ...
])

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

// 模拟接收到开启风机的控制指令/数据更新
function handleBlowerChange(status) {
  if (status === 1) {
    // 开启风机动画
    isBlowerRunning.value = true
  } else {
    // 关闭风机，停止旋转
    isBlowerRunning.value = false
  }
}


const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / 500, 0.1, 10000)
  // camera.position.set(60, -60, 60); 

  // 让相机对准原点（模型所在的位置）
  camera.lookAt(0, 0, 0);

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
  // controls.enableZoom = false;     // 禁用滚轮缩放
  // controls.enablePan = false;      // 禁用右键平移
  // controls.enableRotate=false

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()


  loader.load('/asset/1104_1.fbx', (fbxObject) => {
    const size = 0.2
    fbxObject.scale.set(size, size, size)
    // 自转90度
    // fbxObject.rotation.y =  Math.PI /2
    scene.add(fbxObject)

    // const movingParts = []
    // 是否开启风机的状态标识（联动你的业务数据，比如 status === 1）

    fbxObject.traverse((child) => {
      if (child.isMesh) {
        console.log('部件ID:', child.id, ' 名字:', child.name);
        // 收集需要动的部件
        // if (
        //   [



        //     // 'g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6',
        //     // 'g1_instance_2', 'g2_instance_2', 'g3_instance_2', 'g6_instance_instance_4'
        //   ].includes(child.name)
        // ) {
        //   // movingParts.push(child)
        // }
        // else 
        if (child.name === 'fengshan') {
          blowerBladeMesh = child
          // blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
          //  核心修复代码：开启双面渲染
          if (child.material) {
            child.material.side = THREE.DoubleSide

            // 可选优化：如果材质是一个数组（部分模型有多材质），需要遍历修改
            // if (Array.isArray(child.material)) {
            //     child.material.forEach(m => m.side = THREE.DoubleSide)
            // } else {
            //     child.material.side = THREE.DoubleSide
            // }
          }
        }
      }
    })

    windowsList.value.forEach((movingParts, index) => {
      windowGroup = new THREE.Group()
      scene.add(windowGroup)

      // 【关键：动态修正翻转轴心点】
      // 默认通过计算移动部件的包围盒，找到它的几何中心
      const box = new THREE.Box3().setFromObject(windowGroup)
      const center = box.getCenter(new THREE.Vector3())

      // 情况 A：如果是“上悬窗”（绕着上边框转）
      // 轴心应该设在包围盒的顶部：Y轴设为 box.max.y
      // windowGroup.position.set(center.x, box.max.y, center.z)
      windowGroup.position.set(box.max.x, box.min.y, box.min.z)

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

      // 将运动部件安全吸附到运动组
      movingParts.forEach((part) => {
        windowGroup.attach(part)
      })
      windowsList.value[index].group = windowGroup
    })
    // windowsList.value[0].group = group_0
    // windowsList.value[1].group = group_1


    // 相机自动聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    const modelCenter = fullBox.getCenter(new THREE.Vector3())

    controls.target.copy(modelCenter)
    // 【新增安全机制】由于手动改了 target，最好让相机位置也基于中心点错开，防止镜头陷在模型里
    camera.position.set(modelCenter.x - 60, modelCenter.y, modelCenter.z)
    controls.update()


  }, undefined, (error) => {
    console.error('FBX 模型加载失败:', error)
  })
}


let currentSpeed = 0 // 当前实时转速
const maxSpeed = 0.12 // 最高目标转速
const acceleration = 0.003 // 加速度 / 减速度

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
    windowGroup.rotation.y = - currentAngle.value
  }

  // if (isBlowerRunning.value && blowerBladeMesh) {
  //   // 顺时针旋转。根据你模型的朝向，决定是改 x、y 还是 z 轴
  //   blowerBladeMesh.rotation.z -= blowerSpeed

  //   // 性能优化：防止数字无限变大，转满一圈后重置
  //   if (blowerBladeMesh.rotation.z < -Math.PI * 2) {
  //     blowerBladeMesh.rotation.z = 0
  //   }
  // }
  if (blowerBladeMesh) {
    // blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
    if (isBlowerRunning.value) {
      console.log('blower running')
      // 启动时：平滑加速到最大速度
      if (currentSpeed < maxSpeed) {
        currentSpeed += acceleration
      }

    } else {
      // 关闭时：依靠惯性平滑减速到 0
      if (currentSpeed > 0) {
        currentSpeed -= acceleration
      }
      else if (currentSpeed < 0) {
        currentSpeed = 0
      }

    }

    // 应用旋转
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
  // window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  // window.removeEventListener('resize', handleResize)
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
