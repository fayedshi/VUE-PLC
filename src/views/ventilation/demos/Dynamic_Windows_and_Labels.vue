<template>
  <!-- 外层统一容器，锁定视口高度并隐藏溢出，防止出现滚动条 -->
  <div class="page-wrapper">
    <!-- 顶部悬浮控制栏：改为绝对定位悬浮在 3D 场景上方，不挤占画布空间 -->
    <div class="houseselect-bar">
      <HouseSelect v-model="selectedHouseCode" @change="handleHouseChange" />
      <el-tabs v-model="activeTab" class="wall-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="南墙" :name="0"></el-tab-pane>
        <el-tab-pane label="北墙" :name="1"></el-tab-pane>
      </el-tabs>
    </div>

    <!-- 3D 渲染主容器 -->
    <div class="scene-container">
      <!-- 3D 渲染画布 -->
      <canvas ref="canvasRef" class="webgl-canvas"></canvas>

      <!-- HTML 菜单图层：由数据驱动自动渲染 -->
      <div class="ui-container">
        <div v-for="win in windowPosList" :key="win.id" v-show="win.isPresented" class="window-menu" :style="{
          transform: `translate3d(${win.screenX}px, ${win.screenY}px, 0) translate(-50%, -120%)`
        }">
          <WindowWidget v-if="device3DList?.[win.id]" :data="device3DList[win.id]" :seqNo="win.id"
            @action="handleDeviceAction" />
        </div>
      </div>

      <div class="instructions">Vue 3 数据驱动：按住鼠标拖拽旋转视角</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, markRaw } from 'vue';
import HouseSelect from '../../../components/HouseSelect.vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WindowWidget from '../../../components/WindowWidget.vue'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useWindowControlStore } from '../../../store/WindowControl.ts'

// --- 1. 响应式数据定义（核心管理池） ---
const canvasRef = ref(null);
// const windows = ref([
//   { id: 1, title: '左侧窗户', pos3D: new THREE.Vector3(-8, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
//   { id: 2, title: '中间窗户', pos3D: new THREE.Vector3(-5, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
//   { id: 3, title: '右侧窗户', pos3D: new THREE.Vector3(-2, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false }
// ]);
const windowPosObj = {}
const baseWinVector = new THREE.Vector3(-8.5, 6.5, 0.05)
const baseACVectors = [new THREE.Vector3(-6.5, 3.5, 0.05), new THREE.Vector3(4.0, 3.5, 0.05)]
const windowPosList = ref([])


const activeTab = ref(0)

// name 参数即为 el-tab-pane 上绑定的 name（'params' 或 'valves'）
const handleTabChange = async (name) => {
  console.log('当前切换到了：', name)
  if (name === 0) {
    // 切换到南墙 3D 逻辑
    activeTab.value = 0

  } else if (name === 1) {
    // 切换到北墙 3D 逻辑
    activeTab.value = 1
  }

  console.log('after switch tab active devs:', activeDeviceList.value)
  console.log('after switch tab north dev3DPosList.value:', dev3DPosList.value)
  // device3DList = {}
  activeWinMeshes.forEach(mesh => {
    scene.remove(mesh)
    // 2. 彻底释放旧mesh占用的显卡内存（如果以后不再复用这个 mesh）
    mesh.geometry?.dispose()
    mesh.material?.dispose()
  })
  cancelAnimationFrame(animationFrameId);
  await init3DWindows(activeDeviceList.value)
  animate()
  project3DToScreen()


}

// const bottomWindows = computed(() => {
//   const windows = {}
//   const baseVector = new THREE.Vector3(-8, 0.5, 0.05)
//   for (let i = 11; i <= 14; i++) {
//     windows[i] = { id: 1, title: '左侧窗户', pos3D: baseVector, screenX: 0, screenY: 0, isPresented: false }
//     windows[i].pos3D.x += i * 3 //x方向隔3个单位
//   }
//   return windows
// })

// --- 2. Three.js 变量（无需响应式，避免性能损耗） ---
let scene, camera, renderer, controls, animationFrameId;

const tempPosition = new THREE.Vector3();
const store = useWindowControlStore()

// --- 3. 核心计算与渲染循环 ---
let currentSpeed = 0
const maxAngle = Math.PI / 2
const speed = 0.00058
const maxSpeed = 0.12
const acceleration = 0.003


// --- 4. 按钮点击事件 ---
const handleAction = (title) => {
  alert(`Vue 3 触发：${title}已开启`);
};
const selectedHouseCode = ref('')
const handleDeviceAction = async ({ type, id, action }) => {
  await store.controlDevice(selectedHouseCode.value, type, id, action)
}

const handleHouseChange = async () => {
  await Promise.all([
    store.initDeviceConfig(selectedHouseCode.value),
    initThree(),
    // initWebSocket()
  ])
  console.log('activeDeviceList.value', activeDeviceList.value)
  windowPosList.value = dev3DPosList.value
  await init3DWindows(activeDeviceList.value)
  console.log('device3DList in handle house change: ', device3DList)
  testDevicesForDebug()
  animate()
  project3DToScreen()
}

// --- 5. 处理窗口缩放 ---
const handleResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const activeDeviceList = computed(() => {
  const fullDevList = store.windowStateList.concat(store.acStateList);
  console.log('fulldevs:', fullDevList, 'activtab: ', activeTab.value)
  const southIds = [1, 2, 3, 4, 5, 11, 12, 13, 14, 33, 34]
  if (!activeTab.value) {
    return fullDevList.filter(window => southIds.includes(window.id))
  } else {
    return fullDevList.filter(window => !southIds.includes(window.id))
  }

  // return store.windowStateList.filter(window => [2].includes(window.id))
})


const loader = new FBXLoader()
let device3DList = reactive({})
let activeWinMeshes = []
const init3DWindows = async (activeDeviceList) => {
  activeWinMeshes = []
  let devType = 'upperwindow'
  const blowerWinFbx = await loadModel('damper_blower')
  const simplerUpperWinFbx = await loadModel('upperwindow')
  const fanWinFbx = await loadModel('fan_window')
  const acFbx = await loadModel('ac')

  activeDeviceList.forEach(deviceState => {
    console.log('loading dev state obj', deviceState)
    let fbxObj = simplerUpperWinFbx
    console.log('fbxobj:', fbxObj)
    let win3d = {
      id: deviceState.id,
      status: deviceState.status,
      currentAngle: 0,
      group: null,           // 存放 THREE.Group
      blowerBladeMesh: null,
      blowerState: -1,
      openUpward: true,
      fan: null,
      blower: null
    }
    if (deviceState.fan) {
      win3d.blowerState = deviceState.fan.status
      win3d.fan = deviceState.fan
      fbxObj = fanWinFbx
      devType = 'fanWindow'
    } else if (deviceState.blower) {
      fbxObj = blowerWinFbx
      devType = 'blowerWindow'
      win3d.blowerState = deviceState.blower.status
      win3d.openUpward = false
      win3d.blower = deviceState.blower
    } else if (!('fan' in deviceState)) { // ac feature
      console.log('loaded ac')
      fbxObj = acFbx
    }
    device3DList[deviceState.id] = win3d

    const winMesh = fbxObj.clone();
    // winMesh.rotation.y += Math.PI
    // 注意：旋转后记得更新一下矩阵，再进行后续的包围盒和转轴计算
    // winMesh.updateMatrixWorld(true)

    const [parts, bladeMesh] = loadMovingMeshes(devType, winMesh)
    const movingParts = parts
    const blowerBladeMesh = bladeMesh
    // 将运动部件安全吸附到运动组
    win3d.blowerBladeMesh = blowerBladeMesh

    const windowGroup = new THREE.Group()
    winMesh.position.copy(windowPosObj[deviceState.id].pos3D);
    winMesh.add(windowGroup)
    scene.add(winMesh)
    activeWinMeshes.push(winMesh)
    if (movingParts.length == 0) {
      // AC has no window moving meshes except blade
      return
    }
    movingParts.forEach((part) => {
      windowGroup.attach(part)
    })

    // const boxHelper = new THREE.BoxHelper(windowGroup, 0xff0000);
    // scene.add(boxHelper);
    win3d.group = windowGroup

    const box = new THREE.Box3().setFromObject(windowGroup)
    //box3算出来的是世界坐标，如果此时winmesh不在原点，则需要转换成局部坐标再赋值
    // movingParts.forEach((part) => {
    //   part.updateMatrixWorld(true)
    //   box.expandByObject(part)
    // })

    let xVal = win3d.openUpward ? box.max.x : box.min.x
    const worldPivot = new THREE.Vector3(xVal, box.max.y, box.min.z) // 左侧开
    // const worldPivot = new THREE.Vector3(box.min.x, (box.min.y + box.max.y) / 2, box.min.z) // 往上开
    const localPivot = winMesh.worldToLocal(worldPivot.clone())

    // // // 4. 将旋转组放置在侧边合页处
    windowGroup.position.copy(localPivot)
    windowGroup.updateMatrixWorld(true)

    movingParts.forEach((part) => {
      part.position.x -= windowGroup.position.x
      part.position.y -= windowGroup.position.y
      part.position.z -= windowGroup.position.z
    })

    // const boxHelper = new THREE.BoxHelper(windowGroup, 0xff0000);
    // scene.add(boxHelper);
    // console.log('winmesh pos:', winMesh.position)
    console.log('winmesh pos latest:', winMesh.position)


    // store.acStateList.forEach(acState => {
    //   device3DList[acState.id] = reactive({
    //     id: acState.id,
    //     group: null,
    //     blowerBladeMesh: null,
    //     blowerState: -1,
    //   })
    // })
  })
  console.log('in init3d device3dlist:', device3DList)

}

const testDevicesForDebug = () => {
  // writing for test
  // device3DList[2].status = 1
  // device3DList[2].blowerState = 1
  // device3DList[3].status = 1
  // device3DList[3].blowerState = 1
  // device3DList[4].status = 1
  // device3DList[4].blowerState = 1
  // device3DList[11].status = 1
  // device3DList[11].blowerState = 2
  // device3DList[12].status = 1
  // device3DList[12].blowerState = 2

  // device3DList[33].blowerState = 1
  // device3DList[34].blowerState = 1
  // writing for test
}

const loadModel = (async devType => {
  const fbx = await loader.loadAsync(`/asset/${devType}.fbx`)
  const size = 0.012
  fbx.scale.set(size, size, size)
  fbx.rotation.y = Math.PI / 2
  if (devType == 'ac') {
    fbx.rotation.y -= Math.PI
    // fbx.rotation.y = Math.PI / 2
  }

  const box = new THREE.Box3().setFromObject(fbx);
  //   console.log('box', box)
  const center = box.getCenter(new THREE.Vector3());
  console.log('center', center)
  // 将模型内部网格拉回原点（如果希望底部贴地，y 可以用 box.min.y）

  fbx.position.sub(center);

  const wrapper = new THREE.Group();
  fbx.position.z += 0.25
  wrapper.add(fbx)

  // return [fbx, wrapper]
  return wrapper
})

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 1. 窗戶動畫：高速渲染迴圈直接讀寫普通變數的屬性，效率最高
  Object.values(device3DList).forEach(windowItem => {
    if (windowItem.group) {
      if (windowItem.status === 1) {
        // console.log('item', windowItem, ' opening')
        windowItem.currentAngle += speed
        if (windowItem.currentAngle >= maxAngle) {
          windowItem.currentAngle = maxAngle
        }
      } else if (windowItem.status === 2) {
        windowItem.currentAngle -= speed
        if (windowItem.currentAngle <= 0) {
          windowItem.currentAngle = 0
          // windowItem.status = 'closed'
        }
      }
      else if (windowItem.status === 4) {
        windowItem.currentAngle = maxAngle
      } else if (windowItem.status === 5) {
        windowItem.currentAngle = 0
      }
      // 驅動 3D 群組旋轉
      if (windowItem.openUpward) {
        windowItem.group.rotation.x = -windowItem.currentAngle //往上开,本应是rotation.x，这里是局部x轴
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
  project3DToScreen()

  // 更新 3D 控制器与渲染
  if (controls) controls.update();
  if (renderer && scene && camera)
    renderer.render(scene, camera);

  // 遍历数据源，计算 2D 投影坐标
  // console.log('line 324', windows.value)
  // windowPosList.value.forEach((win, index) => {
  //   // 1. 复制该窗户的固定的 3D 世界坐标
  //   tempPosition.copy(win.pos3D);

  //   // 2. 投影到相机的标准设备坐标系 (NDC)
  //   tempPosition.project(camera);

  //   // 3. 裁剪优化：如果 z > 1，说明窗户在相机背面，将其从视图中隐藏
  //   if (tempPosition.z > 1) {
  //     win.isPresented = false;
  //     return;
  //   }

  //   // 4. 转换为屏幕的实际像素坐标 (X, Y)
  //   win.screenX = (tempPosition.x * 0.5 + 0.5) * window.innerWidth;
  //   win.screenY = (tempPosition.y * -0.5 + 0.5) * window.innerHeight;

  //   // win.screenX = 200 * index
  //   // win.screenY = 100 + index*10 
  //   // 5. 在屏幕范围内则显示
  //   win.isPresented = true;


  // });
};

const partsCache = {}
const loadMovingMeshes = ((devType, fbx) => {
  // const winMeshGroup = new THREE.Group()
  let blowerBladeMesh = null
  const movingParts = []
  // if (partsCache[devType]) {
  //   return partsCache[devType]
  // }
  fbx.traverse(child => {
    if (child && child.isMesh) {
      const parentName = child.parent ? child.parent.name : null
      console.log('发现窗户部件:', child.name, 'parent:', parentName)
      // 收集需要动的部件
      if (
        ['v', 'v2', '0_2', '2', 'BT_DLSZD_03',
          'BT_RJCHY_01_02', 'BT_RJCHY_01_02_instance', 'g1', 'g2', 'k'
        ].includes(child.name)
      ) {
        console.log('adding child', child)
        movingParts.push(child)
      }
      else if (child.name === 'fengshan') {
        blowerBladeMesh = child
        // blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
        //  核心修复代码：开启双面渲染
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.side = THREE.DoubleSide
          })
        } else {
          child.material.side = THREE.DoubleSide
        }
      }
    }
  })
  partsCache[devType] = [movingParts, blowerBladeMesh]
  return partsCache[devType]
})


let socket = null
let isExplicitlyClosed = false
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
    const statesResp = JSON.parse(event.data);
    // console.log('devstate list', event.data)
    // controlMode.value = devStatesObj.value?.['switch'][0]
    store.updateStatus(statesResp)
    activeDeviceList.value.forEach(devState => {

      let dev3d = device3DList[devState.id]
      dev3d.status = devState.status
      if (devState.fan) {
        dev3d.blowerState = devState.fan.status
      }
      else if (devState.blower) {
        dev3d.blowerState = devState.blower.status
      } else if (!('fan' in devState)) { // ac
        dev3d.blowerState = devState.status
      }
    })

    // store.acStateList.forEach((acState) => {
    //   let ac = device3DList[acState.id]
    //   ac.blowerState = acState.status
    // })

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

// --- 6. 生命周期钩子 ---
// const southWindowCount = ref(0)
onMounted(async () => {
  // testDevicesForDebug()
  // await Promise.all([
  //   store.initDeviceConfig(selectedHouseCode.value),
  //   initWebSocket()
  // ])

  // windowPosList.value = buildWindowPosList()
  // initThree()
  // await init3DWindows()
  // animate()
  // project3DToScreen()
})



const project3DToScreen = () => {
  windowPosList.value.forEach((win, index) => {
    // 1. 复制该窗户的固定的 3D 世界坐标
    tempPosition.copy(win.pos3D);

    // 2. 投影到相机的标准设备坐标系 (NDC)
    tempPosition.project(camera);

    // 3. 裁剪优化：如果 z > 1，说明窗户在相机背面，将其从视图中隐藏
    if (tempPosition.z > 1) {
      win.isPresented = false;
      return;
    }

    // 4. 转换为屏幕的实际像素坐标 (X, Y)
    win.screenX = (tempPosition.x * 0.5 + 0.5) * window.innerWidth;
    win.screenY = (tempPosition.y * -0.5 + 0.5) * window.innerHeight;

    // win.screenX = 200 * index
    // win.screenY = 100 + index*10 
    // 5. 在屏幕范围内则显示
    win.isPresented = true;
  })
}


const initThree = async () => {

  // 初始化 Three.js 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#f1f5f9');

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 16);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // 创建 3D 墙体
  const wallGeo = new THREE.BoxGeometry(18, 12, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(-1, 2, 0);
  scene.add(wall);

  // 创建 地面
  const floorGeo = new THREE.PlaneGeometry(23, 18);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3;
  floor.receiveShadow = true;
  scene.add(floor);


  // 创建 3D 窗户并加入场景
  // const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.3);
  // const windowMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 });

  // 监听窗口大小变化并启动动画
  window.addEventListener('resize', handleResize);
  // animate();
}

const dev3DPosList = computed(() => {
  let j = 0
  return activeDeviceList.value.map(window => {
    let pos = baseWinVector.clone()
    let i = window.id
    if (i == 6 || i == 11 || i == 15) {
      // pos.x = baseVector.x
      j = 0
    }
    if (i >= 11) {
      pos.y = -2 // y轴下移2个单位
      console.log('id', i, 'pos.x: ', pos.x)
      pos.x += j * 1
    }

    pos.x += j * 3.7 //x方向隔3个单位
    if (i > 32) { //ac
      pos = baseACVectors[i - 33]
    }
    const windowPos = { id: i, title: '窗户' + i, pos3D: pos, screenX: 0, screenY: 0, isPresented: false }
    windowPosObj[i] = windowPos
    j++
    return windowPos
  })
})

onUnmounted(() => {
  // 组件销毁时清除定时器与监听，防止内存泄漏
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', handleResize);
  if (controls) controls.dispose();
  if (renderer) renderer.dispose();
  destroyThreeInstance()
  if (socket) {
    isExplicitlyClosed = true
    socket.close()
  }
});


function destroyThreeInstance() {
  // 1. 停止渲染循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // 2. 销毁控制器（如 OrbitControls）
  if (controls) {
    controls.dispose()
  }

  // 3. 清空场景中的所有模型与贴图
  if (scene) {
    // clearAllModels(scene)
    scene.clear()
  }

  // 4. 销毁渲染器并释放 WebGL 上下文
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss() // 强制释放显卡上下文
    renderer.domElement = null
    renderer = null
  }
}

</script>
<style scoped>
/* 外层垂直 Flex 容器 */
.page-wrapper {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
}

/* 顶部独立控制栏：不再使用 position: absolute */
.houseselect-bar {
  flex-shrink: 0;
  /* 防止高度被压缩 */
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background-color: #252526;
  border-bottom: 1px solid #333;
  z-index: 10;
}

/* 去掉 el-tabs 默认的底部边距，保持顶栏紧凑 */
.wall-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.wall-tabs :deep(.el-tabs__item) {
  color: #ccc;
}

.wall-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
}

.wall-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: transparent;
}

/* 下方 3D 容器：自动填满剩余所有空间 */
.scene-container {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  /* 关键：防止 Flex 子项内容撑破高度 */
  overflow: hidden;
}

.webgl-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: block;
}

.ui-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
}

.window-menu {
  position: absolute;
  top: 0;
  left: 0;
  color: white;
  border-radius: 6px;
  pointer-events: auto;
  will-change: transform;
}

.instructions {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #aaa;
  z-index: 20;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  white-space: nowrap;
}
</style>