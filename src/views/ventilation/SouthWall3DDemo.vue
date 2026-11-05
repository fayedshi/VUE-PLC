<template>
  <div class="window-container">

    <div class="left-panel">
      <h3>控制面板</h3>
      <!-- <div class="control-btn-group alignment-center">窗 #1
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
    -->
      <el-row :gutter="20" v-if="store.windowStateList.length > 0">
        <el-col v-for="item in store.windowStateList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="8">
          <WindowCard :data="item" @action="handleDeviceAction" />
        </el-col>
      </el-row>
    </div>
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useWindowControlStore, WindowActionEnum } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
// import { onMounted, ref, computed, onBeforeUnmount } from 'vue'

const store = useWindowControlStore()

const canvasContainer = ref(null) // 只有畫布 DOM 節點需要 ref 獲取元素

let scene, camera, renderer, controls, animationFrameId

// 旋轉配置
const maxAngle = Math.PI / 2
const speed = 0.01
// let blowerBladeMesh = null
const isBlowerRunning = ref(false) // 風機狀態保留 ref 供業務邏輯聯動（若不需要也可改 let）

const group_0 = ['v', 'v2', '0_2', '2', 'BT_DLSZD_03', 'BT_RJCHY_01_02']
const group_1 = ['g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']

const windowCount = 18
const partNameGroups = []
const blowerMeshNames = []
for (let i = 0; i < windowCount; i++) {
  partNameGroups[i] = []
  if (i == 4) {
    partNameGroups[i] = group_1
  } else if (i == 13) {
    partNameGroups[i] = group_0
    blowerMeshNames[i] = 'fengshan_instance_3'
  }

}

// 🎯 【核心修改】完全使用普通 JS 陣列與物件，Vue 碰不到它們，絕對不會有 Proxy 報錯
const window3DList = [
  // {
  //   id: 'window_1',
  //   state: 'closed',       // 'closed', 'opening', 'open', 'closing', 'stopped'
  //   currentAngle: 0,
  //   movingPartNames: group_0,
  //   group: null,           // 存放 THREE.Group
  //   windowMeshList: []       // 存放真實 THREE.Mesh
  // },
  // {
  //   id: 'window_2',
  //   state: 'closed',
  //   currentAngle: 0,
  //   movingPartNames: group_1,
  //   group: null,
  //   realMeshList: []
  // }
]

const selectedHouseCode = ref('001')
const handleDeviceAction = async ({ type, id, action }) => {
  await store.controlDevice(selectedHouseCode.value, type, id, action)
}

// 控制按鈕方法（直接操作普通 JS 物件）
// const controlWindow = (index, action) => {
//   const windowItem = window3DList[index]
//   if (action === 'open') {
//     if (windowItem.state !== 'open') windowItem.state = 'opening'
//   } else if (action === 'close') {
//     if (windowItem.state !== 'closed') windowItem.state = 'closing'
//   } else if (action === 'stop') {
//     windowItem.state = 'stopped'
//   }
// }

function handleBlowerChange(status) {
  isBlowerRunning.value = status === 1
}

const initThree = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f5f9')
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight // 从容器获取实际高度（即刚才设置的800px）

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  canvasContainer.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  // controls.enableDamping = false
  // controls.enableZoom = false;     // 禁用滚轮缩放
  // controls.enablePan = false;      // 禁用右键平移
  // controls.enableRotate = false

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()

  loader.load('/asset/1104_1.fbx', (fbxObject) => {
    const size = 0.015
    fbxObject.scale.set(size, size, size)
    fbxObject.updateMatrixWorld(true)
    const tempBox = new THREE.Box3().setFromObject(fbxObject)

    // 💡 让整个模型的最低点（tempBox.min.y）刚好等于 0 
    // 这样无论模型之前在 3D 软件里的中心点在哪里，它都会整体移动到世界坐标的绝对“地平面”上方
    // fbxObject.position.y = -tempBox.min.y
    scene.add(fbxObject)

    // 遍歷模型，把真實 Mesh 分配到普通陣列中

    fbxObject.traverse((child) => {
      let picked = false
      // 每个mesh只能被以一个window拥有
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : null
        console.log('发现窗户部件:', child.name, 'parent:', parentName)
        for (const windowItem of window3DList) {
          // console.log('winItem', windowItem)
          if (windowItem.movingPartNames.includes(child.name)) {
            windowItem.windowMeshList.push(child)
            break;
          }
          else if (windowItem.blowerBladeMeshName == child.name) {
            if (child.material) {
              child.material.side = THREE.DoubleSide
            }
            windowItem.blowerBladeMesh = child
            break;
          }
        }
        // })
      }
    })

    // 計算軸心與群組建立
    window3DList.forEach((windowItem) => {
      if (windowItem.windowMeshList.length === 0) return

      console.log('winItem', windowItem)
      const windowGroup = new THREE.Group()
      fbxObject.add(windowGroup)
      // scene.add(windowGroup)
      const box = new THREE.Box3().setFromObject(windowGroup)
      // 計算真實包圍盒
      // const tempGroup = new THREE.Group()
      // windowItem.realMeshList.forEach(mesh => tempGroup.add(mesh.clone()))
      windowItem.windowMeshList.forEach(mesh => {

        // windowGroup.attach(mesh)
        // 使用世界坐标包围盒，避免本地坐标和克隆丢失缩放的问题
        const meshBox = new THREE.Box3().setFromObject(mesh)
        box.union(meshBox)
      })

      const center = box.getCenter(new THREE.Vector3())

      // 2. 🎯 将旋转点从 X 轴的中心（center.x）挪到侧边。
      // 如果门应该绕着【左侧】转，用 box.min.x；如果绕着【右侧】转，用 box.max.x。
      // 这里先假设在左侧：
      const pivotX = box.min.x
      const pivotY = box.min.y
      const pivotZ = box.min.z // Z轴通常保持在门厚度的中心

      // 3. 将这个边缘的世界坐标转换为模型的本地坐标
      const worldPivot = new THREE.Vector3(pivotX, pivotY, pivotZ)
      const localPivot = fbxObject.worldToLocal(worldPivot.clone())

      // 4. 将旋转组放置在侧边合页处
      windowGroup.position.set(localPivot.x, localPivot.y, localPivot.z)
      windowGroup.updateMatrixWorld(true)

      // windowGroup.updateMatrixWorld(true) // 强制刷新组的矩阵，让它在正确位置生效
      windowItem.windowMeshList.forEach((mesh) => {
        windowGroup.attach(mesh)
      })

      // 設置旋轉軸心位置
      // windowGroup.position.set(center.x, box.min.y, center.z)

      // 移動真實 Mesh 並吸附
      // windowItem.realMeshList.forEach((mesh) => {
      //   mesh.position.x -= windowGroup.position.x
      //   mesh.position.y -= windowGroup.position.y
      //   mesh.position.z -= windowGroup.position.z
      //   windowGroup.attach(mesh)
      // })

      windowItem.group = windowGroup
    })

    // 相機聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    const modelCenter = fullBox.getCenter(new THREE.Vector3())
    controls.target.copy(modelCenter)
    camera.position.set(modelCenter.x - 60, modelCenter.y, modelCenter.z)
    controls.update()

  }, undefined, (error) => {
    console.error('FBX 模型加载失败:', error)
  })
}

let currentSpeed = 0
const maxSpeed = 0.12
const acceleration = 0.003
const LOCAL_X_AXIS = new THREE.Vector3(1, 0, 0);

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 1. 窗戶動畫：高速渲染迴圈直接讀寫普通變數的屬性，效率最高
  window3DList.forEach(windowItem => {
    if (windowItem.group) {
      if (windowItem.state === 1) {
        console.log('item', windowItem, ' opening')
        windowItem.currentAngle += speed
        if (windowItem.currentAngle >= maxAngle) {
          windowItem.currentAngle = maxAngle
          windowItem.state = 'open'
        }
      } else if (windowItem.state === 2) {
        windowItem.currentAngle -= speed
        if (windowItem.currentAngle <= 0) {
          windowItem.currentAngle = 0
          windowItem.state = 'closed'
        }
      }
      // 驅動 3D 群組旋轉
      windowItem.group.rotation.y = -windowItem.currentAngle
    }

    // 2. 風扇動畫
    if (windowItem.blowerBladeMesh) {
      if (windowItem.blowerState == 1 || windowItem.blowerState == 2) {
        // console.log('running blades')
        if (currentSpeed < maxSpeed) currentSpeed += acceleration
      }
      // else if (windowItem.blowerState == 2) {
      //   if (currentSpeed < maxSpeed) currentSpeed -= acceleration
      // } 
      else if (windowItem.blowerState == 3) {
        if (currentSpeed > 0) currentSpeed -= acceleration
        if (currentSpeed < 0) currentSpeed = 0
      }
      // windowItem.blowerBladeMesh.rotation.x -= currentSpeed
      windowItem.blowerBladeMesh.rotateOnAxis(LOCAL_X_AXIS, -currentSpeed);
      console.log('windowItem.blowerBladeMesh.rotation.x: ', windowItem.blowerBladeMesh.rotation.x)
    }
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



let isExplicitlyClosed = false
let socket = null
let devStatesObj = ref([])
const initWebSocket = () => {
  // todo: need granary switch control in ui, hardcode 001 for now

  socket = new WebSocket(`ws-api/ws/dev-state/${selectedHouseCode.value}`);
  // socket = new WebSocket(`ws://${backendAdd}/ws/dev-state`);`

  // 连接成功事件
  socket.onopen = () => {
    console.log('成功连接到 Python 后端 WebSocket！');
  };

  // 接收到后端实时数据事件
  socket.onmessage = (event) => {
    // 解析后端传过来的 JSON 字符串
    devStatesObj.value = JSON.parse(event.data);
    // console.log('devstate', event.data)
    // controlMode.value = devStatesObj.value?.['switch'][0]
    store.updateStatus(devStatesObj.value)
    store.windowStateList.forEach(winState => {

      let win3d = window3DList.at(winState.id - 1)
      win3d.state = winState.status
      if (winState.fan) {
        win3d.blowerState = winState.fan.status
      }
      if (winState.blower) {
        win3d.blowerState = winState.blower.status
      }
    })

  };

  // 连接关闭事件
  socket.onclose = () => {
    // console.log('【前端提示】连接已断开，3秒后尝试自动重连...');
    if (!isExplicitlyClosed)
      setTimeout(initWebSocket, 3000); // 掉线自动重连机制
  };

  // 发生错误事件
  socket.onerror = (error) => {
    console.error('【前端提示】WebSocket 发生错误:', error);
  };
};

const init3DWindows = () => {
  store.windowStateList.forEach(winState => {
    let win3d = {
      id: winState.id,
      state: winState.status,       // 'closed', 'opening', 'open', 'closing', 'stopped'
      currentAngle: 0,
      movingPartNames: partNameGroups[winState.id - 1],
      group: null,           // 存放 THREE.Group
      windowMeshList: [],       // 存放真實 THREE.Mesh
      blowerBladeMesh: null,
      blowerBladeMeshName: blowerMeshNames[winState.id - 1],
      blowerState: null
    }
    if (winState.fan) {
      win3d.blowerState = winState.fan.status
    }
    if (winState.blower) {
      win3d.blowerState = winState.blower.status
    }
    window3DList.push(win3d)
  })
  // writing for tesst
  window3DList.at(13).blowerState = 1
  window3DList.at(13).state = 1
}


onMounted(async () => {
  await store.initDeviceConfig('001')
  // initWebSocket()
  initThree()
  init3DWindows()
  console.log('3dwindowlist:', window3DList)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  if (renderer) renderer.dispose()
})
</script>

<style scoped>
/* 🎯 核心修改一：外层大容器必须锁定 100% 宽度 */
.window-container {
  display: flex;
  width: 100%;
  /* 必须让总宽度充满父级（如 body） */
  height: 1000px;
  /* 推荐：直接充满整个屏幕高度，也可以设为具体值如 700px */
  margin: 0 auto;
  box-sizing: border-box;
}

/* 左侧控制面板样式 */
.left-panel {
  width: 40%;
  /* 固定的控制面板宽度 */
  padding: 10px;
  background-color: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  /* 右侧分界阴影 */
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
  height: 100%;
  /* 撑满高度 */
  box-sizing: border-box;
}

/* 🎯 核心修改二：右侧画布自适应逻辑 */
.canvas-container {
  flex: 1;
  /* 牢牢吃满除了左侧 panel 以外的所有剩余宽度 */
  height: 100%;
  /* 高度继承父级的 100vh，直接和左侧面板对齐 */
  background-color: #f1f5f9;
  /* 临时画布背景色，防止加载前全白 */
  overflow: hidden;
}

.left-panel h3 {
  margin-top: 0;
  color: #1e293b;
  font-size: 18px;
  border-left: 4px solid #10b981;
  padding-left: 8px;
}

.control-btn-group {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.alignment-center {
  display: flex;
  flex-direction: column;
  /* 标签在上，按钮在下的垂直分栏，或者改成 row 保持横向 */
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}
</style>