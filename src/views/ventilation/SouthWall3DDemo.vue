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
      <el-row :gutter="20" v-if="southWindowList.length > 0">
        <el-col v-for="item in southWindowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="12">
          <WindowCard :data="item" @action="handleDeviceAction" />
        </el-col>
      </el-row>
    </div>
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { VideoPlay, SwitchButton, VideoPause } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useWindowControlStore, WindowActionEnum } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
// import { onMounted, ref, computed, onBeforeUnmount } from 'vue'

const store = useWindowControlStore()
const southWindowList = computed(() => {
  return store.windowStateList.filter(window => [1, 2, 3, 4, 5, 11, 12, 13, 14].includes(window.id))
})

const canvasContainer = ref(null) // 只有畫布 DOM 節點需要 ref 獲取元素

let scene, camera, renderer, controls, animationFrameId

// 旋轉配置
const maxAngle = Math.PI / 2
const speed = 0.02
// let blowerBladeMesh = null
const isBlowerRunning = ref(false) // 風機狀態保留 ref 供業務邏輯聯動（若不需要也可改 let）

const group_0 = ['v', 'v2', '0_2', '2', 'BT_DLSZD_03', 'BT_RJCHY_01_02']
const group_1 = ['g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']
const upper_win_moving_parts = ['g1', 'g2', 'k']  // 发现窗户部件: k_instance_2 parent: window_3
const base_win_moving_parts = ['d1', 'd2', 'd3']  // 下窗的活动部件
const base_blower_parts = ['fengshan'] // 下窗的风扇部件

const windowCount = 18
const partNameGroups = []
const blowerMeshNames = []
for (let i = 0; i < windowCount; i++) {
  partNameGroups[i] = []
  if (i == 4) {
    partNameGroups[i] = group_1
  } else if (i == 13) {
    partNameGroups[i] = group_0
    blowerMeshNames[i] = 'fengshan'
  }
  // blowerMeshNames[i] = 'fengshan'
}

// 🎯 【核心修改】完全使用普通 JS 陣列與物件，Vue 碰不到它們，絕對不會有 Proxy 報錯
const window3DList = [
]

/**
 * 判断名字是否匹配的函数
 * @param {string} name - 需要检查的名字
 * @returns {boolean} - 是否匹配成功
 */
const checkName = (name, prefixList) => {
  // 如果名字为空，直接返回 false
  if (!name) return false;

  // 🌟 使用 some()：只要数组里有任意一个元素满足条件，就返回 true
  return prefixList.some(item =>
    name === item ||          // 1. 完全相等（包含在数组中）
    name.startsWith(item)     // 2. 或者以该元素开头
  );
};


const selectedHouseCode = ref('001')
const handleDeviceAction = async ({ type, id, action }) => {
  await store.controlDevice(selectedHouseCode.value, type, id, action)
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
  controls.enableZoom = false;     // 禁用滚轮缩放
  // controls.enablePan = false;      // 禁用右键平移
  // controls.enableRotate = false

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()

  loader.load('/asset/1106_southl_with_ac_v1.fbx', (fbxObject) => {
    const size = 0.018
    fbxObject.scale.set(size, size, size)
    fbxObject.position.set(0, 200, 0);
    scene.add(fbxObject)

    // 或者使用 set 方法 (X, Y, Z)

    fbxObject.updateMatrixWorld(true)
    // 相機聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    const modelCenter = fullBox.getCenter(new THREE.Vector3())
    const modelSize = fullBox.getSize(new THREE.Vector3())
    // 🌟 5. 核心修正：相机聚焦与位置
    if (controls) {
      // 让轨道控制器死死盯着模型的几何中心 
      controls.target.copy(modelCenter)

      // 让相机挪到 Y=200 的高度，X 轴左移 60
      // 🌟 【关键修复】：Z 轴必须加上一段距离（例如后退 200，或者根据模型大小动态计算），不能为 0！
      const cameraDistance = modelSize.length() * 1.5 || 200; // 动态根据模型大小决定后退多少
      camera.position.set(
        modelCenter.x - 60, // 往左挪了60公分（X-60）
        modelCenter.y, // 
        modelCenter.z + 10 // 👈 往后退了2米（Z+200）
      )
      // 6. 刷新控制器
      controls.update()
    }

    // 遍歷模型，把真實 Mesh 分配到普通陣列中

    fbxObject.traverse((child) => {
      let picked = false
      // 每个mesh只能被以一个window拥有
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : null
        console.log('发现窗户部件:', child.name, 'parent:', parentName)
        // for (const windowItem of window3DList) {
        // console.log('winItem', windowItem)window3DList[13]

        // if (windowItem.movingPartNames.includes(child.name)) {
        //   windowItem.windowMeshList.push(child)
        //   break;
        // }
        // else if (windowItem.blowerBladeMeshName == child.name) {
        //   if (child.material) {
        //     child.material.side = THREE.DoubleSide
        //   }
        //   windowItem.blowerBladeMesh = child
        //   break
        // }
        if (parentName) {
          if (checkName(child.name, upper_win_moving_parts)) {
            const winId = Number(parentName.split('_').pop());
            console.log('window index for upper win:', winId);
            window3DList[winId - 1].windowMeshList.push(child)
          } else if (checkName(child.name, base_blower_parts)) {
            // const winId = Number(parentName.split('_').pop());
            const winId = Number(parentName.replace('window', '').replace('_', ''));
            if (child.material) {
              child.material.side = THREE.DoubleSide
            }
            console.log(winId); // 输出: 3
            console.log('window index for blower:', winId);
            // window3DList[winId - 1].blowerBladeMeshList.push(child)
            window3DList[winId - 1].blowerBladeMesh = child
          } else if (checkName(child.name, base_win_moving_parts)) {
            // const winId = Number(parentName.split('_').pop());
            const winId = Number(parentName.replace('window', '').replace('_', ''));
            console.log('window index for base win:', winId);
            window3DList[winId - 1].windowMeshList.push(child)
          }
        }
        // }
      }
    })
    console.log('win3dlist', window3DList)
    // 計算軸心與群組建立
    window3DList.forEach((windowItem) => {
      if (windowItem.windowMeshList.length === 0) return

      console.log('winItem', windowItem)
      const windowGroup = new THREE.Group()
      // const blowerGroup = new THREE.Group()
      fbxObject.add(windowGroup)
      // 計算真實包圍盒
      windowItem.windowMeshList.forEach(mesh => {
        windowGroup.attach(mesh)
      })

      // windowItem.blowerBladeMeshList.forEach(mesh => {
      //   blowerGroup.attach(mesh)
      // })

      const box = new THREE.Box3().setFromObject(windowGroup)
      let xVal = windowItem.openUpward ? box.max.x : box.min.x
      const worldPivot = new THREE.Vector3(xVal, box.max.y, box.min.z) // 左侧开
      // const worldPivot = new THREE.Vector3(box.max.x, box.max.y, box.min.z) // 往上开
      const localPivot = fbxObject.worldToLocal(worldPivot.clone())

      // // 4. 将旋转组放置在侧边合页处
      windowGroup.position.set(localPivot.x, localPivot.y, localPivot.z)
      // windowGroup.updateMatrixWorld(true)

      // 移動真實 Mesh 並吸附
      windowItem.windowMeshList.forEach((mesh) => {
        mesh.position.x -= windowGroup.position.x
        mesh.position.y -= windowGroup.position.y
        mesh.position.z -= windowGroup.position.z
      })
      windowItem.group = windowGroup
    })
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
  window3DList.forEach(windowItem => {
    if (windowItem.group) {
      if (windowItem.state === 1) {
        console.log('item', windowItem, ' opening')
        windowItem.currentAngle += speed
        if (windowItem.currentAngle >= maxAngle) {
          windowItem.currentAngle = maxAngle
        }
      } else if (windowItem.state === 2) {
        windowItem.currentAngle -= speed
        if (windowItem.currentAngle <= 0) {
          windowItem.currentAngle = 0
          // windowItem.state = 'closed'
        }
      }
      else if (windowItem.state === 4) {
        windowItem.currentAngle = maxAngle
      } else if (windowItem.state === 5) {
        windowItem.currentAngle = 0
      }
      // 驅動 3D 群組旋轉
      if (windowItem.openUpward) {
        windowItem.group.rotation.z = -windowItem.currentAngle //往上开
      } else {
        windowItem.group.rotation.y = -windowItem.currentAngle //往侧边开
      }
    }

    // 2. 風扇動畫
    // if (windowItem.blowerBladeMeshList.length > 0) {
    if (windowItem.blowerBladeMesh) {
      // windowItem.blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
      if (windowItem.blowerState == 1 || windowItem.blowerState == 2) {
        // console.log('running blades')
        if (currentSpeed < maxSpeed) {
          currentSpeed += acceleration
        }
        console.log('windowItem.blowerBladeMesh.rotation.x: ', windowItem.blowerBladeMesh.rotation.x, ' winItem:', windowItem)
      } else if (windowItem.blowerState == 3) {
        if (currentSpeed > 0) {
          currentSpeed -= acceleration
        }
        if (currentSpeed < 0) {
          currentSpeed = 0
        }
      }

      if (currentSpeed > 0) {
        // 直接改變 X 軸角度
        if (windowItem.blowerState == 1) {//正转
          windowItem.blowerBladeMesh.rotation.x -= currentSpeed
          // 防止數值無限增大卡死，滿一圈重置
          if (windowItem.blowerBladeMesh.rotation.x < -Math.PI * 2) {
            windowItem.blowerBladeMesh.rotation.x += Math.PI * 2
          }
        } else if (windowItem.blowerState == 2) {//反转
          windowItem.blowerBladeMesh.rotation.x += currentSpeed
          // 防止數值無限增大卡死，滿一圈重置
          if (windowItem.blowerBladeMesh.rotation.x > Math.PI * 2) {
            windowItem.blowerBladeMesh.rotation.x -= Math.PI * 2
          }
        }

      }


      return
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
      // state: 1,
      currentAngle: 0,
      movingPartNames: partNameGroups[winState.id - 1],
      group: null,           // 存放 THREE.Group
      windowMeshList: [],       // 存放真實 THREE.Mesh
      // blowerBladeMeshList: [],
      blowerBladeMesh: null,
      blowerBladeMeshName: blowerMeshNames[winState.id - 1],
      blowerState: -1,
      openUpward: true
    }
    if (winState.fan) {
      win3d.blowerState = winState.fan.status
    }
    if (winState.blower) {
      win3d.blowerState = winState.blower.status
      win3d.openUpward = false
    }
    window3DList.push(win3d)
  })
  // writing for test
  // window3DList.at(1).blowerState = 1
  // window3DList.at(1).state = 1
  // window3DList.at(11).state = 1
  // window3DList.at(11).blowerState = 2
  // window3DList.at(12).state = 1
  // window3DList.at(12).blowerState = 1
  // writing for test
}


onMounted(async () => {
  await store.initDeviceConfig('001')
  init3DWindows()
  initThree()
  initWebSocket()
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
  width: 30%;
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
  overflow-y: auto;
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