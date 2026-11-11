<template>
  <div class="window-container">

    <div class="left-panel">
      <span>控制面板</span>
      <div v-if="isLoading" class="loading-overlay">⚙️ 正在加载3D模型...</div>
      <el-row :gutter="20" v-if="southWindowList.length > 0">
        <el-col v-for="(item, index) in southWindowList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="12">
          <WindowCard :data="item" :seqNo="index + 1" @action="handleDeviceAction" />
        </el-col>
      </el-row>
      <el-row :gutter="20" v-if="store.acStateList.length > 0">
        <el-col v-for="(item, index) in store.acStateList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="12">
          <WindowCard :data="item" :seqNo="index + 1" @action="handleDeviceAction" />
        </el-col>
      </el-row>
    </div>

    <div ref="canvasContainer" class="canvas-container">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useWindowControlStore } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const isLoading = ref(true)
const store = useWindowControlStore()
const southWindowList = computed(() => {
  return store.windowStateList.filter(window => [1, 2, 3, 4, 5, 11, 12, 13, 14, 33, 34].includes(window.id))
})

const canvasContainer = ref(null) // 只有畫布 DOM 節點需要 ref 獲取元素

let scene, camera, renderer, controls, animationFrameId
const labelRenderer = new CSS2DRenderer();
// 旋轉配置
const maxAngle = Math.PI / 2
const speed = 0.00058
// const speed = 0.00658
// let blowerBladeMesh = null
// const isBlowerRunning = ref(false) // 風機狀態保留 ref 供業務邏輯聯動（若不需要也可改 let）

// const group_0 = ['v', 'v2', '0_2', '2', 'BT_DLSZD_03', 'BT_RJCHY_01_02']
// const group_1 = ['g', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']
const upper_win_moving_parts = ['g1', 'g2', 'k']  // 发现窗户部件: k_instance_2 parent: window_3
const base_win_moving_parts = ['d1', 'd2', 'd3']  // 下窗的活动部件
const blower_parts = ['fengshan'] // 窗或空调的风扇部件
const ac_parts = ['fengji'] // 下窗的风扇部件


// const windowCount = 18
// const partNameGroups = []
// const blowerMeshNames = []
// for (let i = 0; i < windowCount; i++) {
//   partNameGroups[i] = []
//   if (i == 4) {
//     partNameGroups[i] = group_1
//   } else if (i == 13) {
//     partNameGroups[i] = group_0
//     blowerMeshNames[i] = 'fengshan'
//   }
//   // blowerMeshNames[i] = 'fengshan'
// }

// 🎯 【核心修改】完全使用普通 JS 陣列與物件，Vue 碰不到它們，絕對不會有 Proxy 報錯
const device3DList = {
}

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

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  canvasContainer.value.appendChild(renderer.domElement)

  // 4. 关键：创建 CSS2D 渲染器 (负责把 HTML 按钮贴进 3D 空间)

  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';
  // 关键：让 CSS2D 层的鼠标事件默认穿透，只有碰到按钮时才响应
  labelRenderer.domElement.style.pointerEvents = 'none';
  canvasContainer.value.appendChild(labelRenderer.domElement);


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
  console.log('loaded model')

}

const loadWindowModel = () => {
  const loader = new FBXLoader()

  loader.load('/asset/1109_gran_v4.fbx', (fbxObject) => {
    const size = 0.085
    // const size = 1
    fbxObject.scale.set(size, size, size)
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
        modelCenter.x - 150, // 往左挪了60公分（X-60）
        modelCenter.y, // 
        modelCenter.z + 10 // 👈 往后退了2米（Z+200）
      )
      // 6. 刷新控制器
      fbxObject.position.y += 6 // 上移15
      scene.add(fbxObject)
      controls.update()
    }

    // 遍歷模型，把真實 Mesh 分配到普通陣列中

    fbxObject.traverse((child) => {
      // let picked = false
      // 每个mesh只能被以一个window拥有
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : null
        console.log('发现窗户部件:', child.name, 'parent:', parentName)
        if (parentName) {
          console.log('parent name: ', parentName)
          if (checkName(child.name, upper_win_moving_parts)) {
            const winId = Number(parentName.split('_').pop());
            console.log('window index for upper win:', winId);
            if (!child.name.startsWith('k2')) {
              device3DList[winId].windowMeshList.push(child)
            }
          } else if (checkName(child.name, blower_parts)) {
            // const winId = Number(parentName.split('_').pop());
            // const winId = Number(parentName.replace('/window|kongtiao/g', '').replace('_', ''));
            const winId = Number(parentName.replace('window', '').replace('_', ''));
            if (child.material) {
              child.material.side = THREE.DoubleSide
            }
            console.log('window index for blower:', winId);
            // device3DList[winId - 1].blowerBladeMeshList.push(child)
            device3DList[winId].blowerBladeMesh = child
          } else if (checkName(child.name, ac_parts)) {
            // const winId = Number(parentName.split('_').pop());

            // const winId = Number(parentName.replace('/window|kongtiao/g', '').replace('_', ''));
            const acId = Number(parentName.replace('kongtiao', '').replace('_', ''));
            if (child.material) {
              child.material.side = THREE.DoubleSide
            }
            console.log('ac index for blower:', acId);
            // hardcoded for ac id
            device3DList[32 + acId].blowerBladeMesh = child
          }
          else if (checkName(child.name, base_win_moving_parts)) {
            // const winId = Number(parentName.split('_').pop());
            const winId = Number(parentName.replace('window', '').replace('_', ''));
            console.log('window index for base win:', winId);
            device3DList[winId].windowMeshList.push(child)
          }
        }
        // }
      }
    })
    console.log('win3dlist', device3DList)
    // 計算軸心與群組建立
    Object.values(device3DList).forEach((windowItem) => {
      // if (!windowItem.windowMeshList || windowItem.windowMeshList.length === 0) return

      const windowGroup = new THREE.Group()
      fbxObject.add(windowGroup)

      // windowItem.group = windowGroup
      if (!windowItem.windowMeshList) {
        console.warn(`⚠️ 警告: 设备 ${windowItem.id || '未知'} 没有找到对应的 3D Mesh 网格！将使用默认中心点挂载标签。`);

        // 如果没有 Mesh，直接在原地（父级中心）挂一个标签，不让它报空
        // const htmlLabel = create3DMenu()
        // htmlLabel.position.set(2, 2, 0)
        // windowGroup.add(htmlLabel)
        // windowItem.group = windowGroup
        // console.log('winItem with empty meshlist:', windowItem, ' created lable')

        // return // 结束当前设备的后续吸附计算，进入下一个设备
        windowGroup.attach(windowItem.blowerBladeMesh)
      }
      // 計算真實包圍盒
      else {
        windowItem?.windowMeshList?.forEach(mesh => {
          windowGroup.attach(mesh)
        })
      }

      const box = new THREE.Box3().setFromObject(windowGroup)
      let xVal = windowItem.openUpward ? box.max.x : box.min.x
      const worldPivot = new THREE.Vector3(xVal, box.max.y, box.min.z) // 左侧开
      // const worldPivot = new THREE.Vector3(box.max.x, box.max.y, box.min.z) // 往上开
      const localPivot = fbxObject.worldToLocal(worldPivot.clone())

      // // 4. 将旋转组放置在侧边合页处
      windowGroup.position.set(localPivot.x, localPivot.y, localPivot.z)

      // 移動真實 Mesh 並吸附
      windowItem?.windowMeshList?.forEach((mesh) => {
        mesh.position.x -= windowGroup.position.x
        mesh.position.y -= windowGroup.position.y
        mesh.position.z -= windowGroup.position.z
      })

      // console.log('window group pos: ', windowGroup.position)

      const htmlLabel = create3DMenu(windowItem)

      // 方案2：自动贴到窗户右侧边缘外
      // // 1. 重新计算当前 windowGroup (已经对齐好轴心) 的局部包围盒
      // const xBox = windowItem.group ? windowGroup : windowItem.blowerBladeMesh
      const localBox = new THREE.Box3().setFromObject(windowGroup)

      // 2. 计算出窗户模型在局部空间下的总宽度 (X轴最大值减去最小值)
      const windowWidth = localBox.max.x - localBox.min.x

      // 3. 自动设置按钮坐标：
      // 既然它是相对于轴心的局部坐标，我们直接把 X 轴设为窗户的宽度 (windowWidth)
      // 这样按钮就会【刚好贴在窗户的右边缘】！
      // 如果想离边缘再远一点，就额外加个 10 或 20 即可。
      const extraPadding = 30 / size; // 这里加减的数字对应的是你模型原始的巨额尺寸标准
      htmlLabel.position.set(
        windowWidth + extraPadding, // 自动贴到窗户右侧边缘外
        5 / size,                         // Y 轴居中
        10                          // Z 轴往前稍微挪一点，防止和窗户重合闪烁
      )
      // 方案2：自动贴到窗户右侧边缘外



      // 方案1 手动一个个调整
      // 假设在正常世界里，你只想往右移动 10 个单位
      // const normalX = 30;
      // const normalY = 2;
      // const normalZ = 1;

      // // 核心：把正常数值除以 0.045（size），抵消外层的缩小影响
      // // 这样在代码里你写 10，底层实际运行的就是 10 / 0.045 = 222.2
      // htmlLabel.position.set(
      //   normalX / size,
      //   normalY / size,
      //   normalZ / size
      // )
      // 方案1 手动一个个调整

      windowGroup.add(htmlLabel)
      console.log('winItem:', windowItem, ' created lable')
      windowItem.group = windowGroup
    })
  }, undefined, (error) => {
    console.error('FBX 模型加载失败:', error)
  })
}

function create3DMenu(windowItem) {
  // 步骤 A: 用原生 JS 创建标准的 HTML 结构（可以自由绑定 Vue 中的业务逻辑）
  const uiDiv = document.createElement('div');
  uiDiv.className = 'window-ui-container';

  // 创建“开窗”按钮
  const btnOpen = document.createElement('button');
  btnOpen.className = 'window-btn';
  btnOpen.innerText = '开窗';
  btnOpen.onclick = function () {
    // 这里可以调用普通的 JS/Vue 逻辑
    alert(`【Vue 逻辑执行】窗户已开启id: ${windowItem.id} `);
    console.log(`正在控制设备: ${windowItem.id}`);
    // 改变 3D 材质颜色
    // windowMesh.material.color.setHex(0x00ff00);
  };

  // 创建“关窗”按钮
  const btnClose = document.createElement('button');
  btnClose.className = 'window-btn close';
  btnClose.innerText = '关窗';
  btnClose.onclick = function () {
    alert('【Vue 逻辑执行】窗户已关闭');
    // windowMesh.material.color.setHex(0x00aaff);
    // await store.controlDevice(selectedHouseCode.value, type, id, action)
  };

  // 组装 DOM
  uiDiv.appendChild(btnOpen);
  uiDiv.appendChild(btnClose);

  // 步骤 B: 使用 CSS2DObject 将 HTML 包裹成 3D 空间对象
  const htmlLabel = new CSS2DObject(uiDiv);

  // 步骤 C: 设置按钮在 3D 空间中的相对位置 (窗户右侧)
  return htmlLabel
}

let currentSpeed = 0
const maxSpeed = 0.12
const acceleration = 0.003

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 1. 窗戶動畫：高速渲染迴圈直接讀寫普通變數的屬性，效率最高
  Object.values(device3DList).forEach(windowItem => {
    if (windowItem.windowMeshList && windowItem.windowMeshList.length > 0) {
      if (windowItem.state === 1) {
        // console.log('item', windowItem, ' opening')
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
        windowItem.group.rotation.z = -windowItem.currentAngle //往上开,本应是rotation.x，这里是局部x轴
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
    }
  })
  controls.update()
  // 1. 渲染 3D 模型
  if (renderer && scene && camera)
    renderer.render(scene, camera);

  // 2. 核心：必须加上这行来渲染 HTML 按钮
  if (labelRenderer && scene && camera)
    labelRenderer.render(scene, camera);
  // renderer.render(scene, camera)
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
    southWindowList.value.forEach(winState => {

      let win3d = device3DList[winState.id]
      win3d.state = winState.status
      if (winState.fan) {
        win3d.blowerState = winState.fan.status
      }
      if (winState.blower) {
        win3d.blowerState = winState.blower.status
      }
    })

    store.acStateList.forEach((acState) => {
      let ac = device3DList[acState.id]
      // ac.state = acState.status
      ac.blowerState = acState.status
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
  southWindowList.value.forEach(winState => {
    let win3d = {
      id: winState.id,
      state: winState.status,       // 'closed', 'opening', 'open', 'closing', 'stopped'
      // state: 1,
      currentAngle: 0,
      // movingPartNames: partNameGroups[winState.id - 1],
      group: null,           // 存放 THREE.Group
      windowMeshList: [],       // 存放真實 THREE.Mesh
      // blowerBladeMeshList: [],
      blowerBladeMesh: null,
      // blowerBladeMeshName: blowerMeshNames[winState.id - 1],
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
    device3DList[winState.id] = win3d
  })

  store.acStateList.forEach(acState => {
    device3DList[acState.id] = {
      id: acState.id,
      group: null,
      blowerBladeMesh: null,
      blowerState: -1,
    }
  })
  // writing for test
  // device3DList[2].state = 1
  // device3DList[2].blowerState = 1
  // device3DList[3].state = 1
  // device3DList[3].blowerState = 1
  // device3DList[4].state = 1
  // device3DList[4].blowerState = 1
  // device3DList[11].state = 1
  // device3DList[11].blowerState = 2
  // device3DList[12].state = 1
  // device3DList[12].blowerState = 2

  // device3DList[33].blowerState = 1
  // device3DList[34].blowerState = 1
  // writing for test
}


onMounted(async () => {
  await Promise.all([
    store.initDeviceConfig('001'),
    // initWebSocket()
  ]
  )
  console.log('done first part init')
  init3DWindows()
  initThree()
  isLoading.value = false

  console.log('3dwindowlist:', device3DList)
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
  height: 800px;
  /* 推荐：直接充满整个屏幕高度，也可以设为具体值如 700px */
  margin: 0 auto;
  box-sizing: border-box;
}

/* 左侧控制面板样式 */
.left-panel {
  width: 1%;
  /* 固定的控制面板宽度 */
  padding: 10px;
  background-color: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  /* 右侧分界阴影 */
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
  /* height: 10; */
  /* 撑满高度 */
  box-sizing: border-box;
  overflow-y: auto;
}

/* 🎯 核心修改二：右侧画布自适应逻辑 */
/* 🎯 核心修改：改为 .canvas-container，并确保它是相对定位 */
.canvas-container {
  flex: 1;
  height: 800px;
  background-color: #f1f5f9;
  overflow: hidden;
  position: relative;
  /* 必须是 relative，这样里面的 absolute 渲染层才能以此为基准对齐 */
}

/* 🎯 核心修改：穿透设置动态生成的按钮样式（换成了 .canvas-container） */
.canvas-container :deep(.window-ui-container) {
  /* font-size: 6px  !important; */
  display: flex;
  /* flex-direction: column; */
  justify-content: space-between;
  gap: 6px;
  background: rgba(0, 0, 0, 0.8) !important;
  padding: 5px;
  border-radius: 6px;
  border: 1px solid #555;
  pointer-events: auto !important;
  /* 强制开启点击，把点击权从大透明层抢回来 */
  z-index: 9999 !important;
  /* 强制置于最顶层 */
}

/* 🎯 核心修改：按钮自身的穿透设置 */
.canvas-container :deep(.window-btn) {
  color: white;
  background: #2196F3;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
  pointer-events: auto !important;
  /* 确保按钮本身可点击 */
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