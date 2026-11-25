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
        <div v-for="win in dev3DPosList" :key="win.id" v-show="win.isPresented" class="window-menu" :style="{
          transform: `translate3d(${win.screenX}px, ${win.screenY}px, 0) translate(15%, -120%)`
        }">
          <WindowWidget v-if="rawDevMap?.[win.id]" :data="rawDevMap[win.id]" :seqNo="win.id"
            @action="handleDeviceAction" />
        </div>

        <div class="instructions">Vue 3 数据驱动：按住鼠标拖拽旋转视角</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, markRaw, onBeforeUnmount } from 'vue';
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
let wallMinx = 0, wallMaxX = 0, wallTopY = 0, floorBottom = 0

const activeTab = ref(0)

// name 参数即为 el-tab-pane 上绑定的 name（'params' 或 'valves'）
const handleTabChange = async (name) => {
  console.log('当前切换到了：', name)
  activeTab.value = name
  southWallGroup.visible = name == 0
  northWallGroup.visible = name == 1

  console.log('after switch tab active devs:', activeDevIdList.value)
  console.log('after switch tab north dev3DPosList.value:', dev3DPosList.value)
}


// --- 2. Three.js 变量（无需响应式，避免性能损耗） ---
let scene, camera, renderer, controls, animationFrameId;

const tempPosition = new THREE.Vector3();
const store = useWindowControlStore()

// --- 3. 核心计算与渲染循环 ---
let currentSpeed = 0
const maxAngle = Math.PI / 2
const speed = 0.037
const maxSpeed = 0.16
const acceleration = 0.08


// --- 4. 按钮点击事件 ---
const handleAction = (title) => {
  alert(`Vue 3 触发：${title}已开启`);
};
const selectedHouseCode = ref('')
const handleDeviceAction = async ({ type, id, action }) => {
  await store.controlDevice(selectedHouseCode.value, type, id, action)
}

/**
 * 彻底清除 scene 上的所有模型并释放 GPU 显存
 * @param {THREE.Scene} scene - Three.js 场景对象
 * @param {boolean} keepLightsAndCameras - 是否保留灯光和相机（默认 true）
 */
function clearScene(scene, keepLightsAndCameras = false) {
  // 1. 递归释放单个物体及其子节点的显存资源
  const disposeObject = (obj) => {
    if (obj.geometry) {
      obj.geometry.dispose()
    }

    if (obj.material) {
      // 处理多材质数组或单材质
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach((mat) => {
        if (!mat) return
        // 遍历材质上的所有属性，销毁绑定的贴图 (map, normalMap, roughnessMap 等)
        for (const key in mat) {
          const value = mat[key]
          if (value && typeof value === 'object' && value.isTexture) {
            value.dispose()
          }
        }
        mat.dispose()
      })
    }
  }

  // 2. 倒序遍历 scene.children（防止遍历过程中移除元素导致索引错乱）
  for (let i = scene?.children?.length - 1; i >= 0; i--) {
    const child = scene.children[i]

    // 如果需要保留灯光、相机或辅助线，跳过它们
    if (keepLightsAndCameras && (child.isLight || child.isCamera)) {
      continue
    }

    // 递归释放该模型内部所有层级的显存
    child.traverse((node) => {
      disposeObject(node)
    })

    // 从场景树中移除
    scene.remove(child)
  }
}

let southIds = [] // house 001
// const southIds = [1, 2, 3, 4, 5, 11, 12, 33, 34] // house 002
// for house 1 and house 2
const southIdArray = [[1, 2, 3, 4, 5, 11, 12, 13, 14, 33, 34], [1, 2, 3, 4, 5, 11, 12, 33]]
const southIdSet = ref([]);
console.log('southidset:', southIdSet.value)
let [blowerWinFbx, simplerUpperWinFbx, fanWinFbx, acFbx] = [null, null, null, null]

const handleHouseChange = async () => {
  if (socket) {
    isExplicitlyClosed = true;
    console.log('closed socket in house change')
    socket.close();
  }

  if (!scene) {
    await initThree()
  } else {
    console.log('to remove wallgroup')
    scene.remove(southWallGroup);
    scene.remove(northWallGroup);
    cancelAnimationFrame(animationFrameId);
  }
  // 手动触发一次渲染或等一帧让浏览器先把隐藏画面画出来：
  renderer.render(scene, camera);

  await Promise.all([
    store.initDeviceConfig(selectedHouseCode.value),
    initWebSocket(),
    new Promise((resolve) => setTimeout(resolve, 200))
  ])

  // await new Promise((resolve) => setTimeout(resolve, 1000));

  // console.log('显存资源统计:', renderer.info.memory);
  console.log('selected house', selectedHouseCode.value)
  southWallGroup = new THREE.Group()
  northWallGroup = new THREE.Group()
  southIds = southIdArray[Number(selectedHouseCode.value) - 1]
  southIdSet.value = new Set(southIds)
  console.log('south ids', southIds)

  if (!blowerWinFbx) {
    console.log('load base models again');
    const models = await Promise.all([
      loadModel('damper_blower'),
      loadModel('upperwindow'),
      loadModel('fan_window'),
      loadModel('ac')]);
    [blowerWinFbx, simplerUpperWinFbx, fanWinFbx, acFbx] = models
    const box = new THREE.Box3().setFromObject(simplerUpperWinFbx);
    windowWidth = box.max.x - box.min.x
    console.log('windowWidth in init3d', windowWidth)
    // blowerWinFbx.traverse((node) => {
    //   if (node.material && node.material.map) {
    //     console.log(node.name, node.material.map.image.width, node.material.map.image.height);
    //   }
    // });
  }

  console.log('activeDeviceList.value', activeDevIdList.value)
  device3DList.value = {}
  testDevicesForDebug()
  southWallGroup.visible = activeTab.value == 0
  northWallGroup.visible = activeTab.value == 1

  init3DWindows()
  animate()
}

// --- 5. 处理窗口缩放 ---
const handleResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const fullDevList = computed(() => {
  console.log('windowStateList: ',)
  return store.windowStateList.concat(store.acStateList)
})

const rawDevMap = computed(() =>
  Object.fromEntries((fullDevList.value || []).map(item => [item.id, item]))
);



const activeDevIdList = computed(() => {


  if (!activeTab.value) {
    return southIdSet.value
  } else {
    return new Set(fullDevList.value.filter(window => !southIdSet.value.has(window.id)).map(window => window.id))
  }

  // return store.windowStateList.filter(window => [2].includes(window.id))
})


let windowWidth = 0
const loader = new FBXLoader()
let device3DList = ref({})
let southWallGroup = new THREE.Group()
let northWallGroup = new THREE.Group()
const init3DWindows = () => {
  // activeWinMeshes = []
  let devType = 'upperwindow'

  // console.log('windowWidth in init3d', windowWidth)
  console.log('fullDevList:', fullDevList.value)
  fullDevList.value.forEach(deviceState => {
    console.log('loading dev state obj', deviceState.id, ' status:', deviceState)
    let fbxObj = simplerUpperWinFbx
    // console.log('fbxobj:', fbxObj)
    let win3d = {
      id: deviceState.id,
      currentAngle: deviceState.status == 2 ? maxAngle : 0,
      group: null,           // 存放 THREE.Group
      blowerBladeMesh: null,
      openUpward: true,
    }
    if (deviceState.fan) {
      fbxObj = fanWinFbx
      devType = 'fanWindow'
    } else if (deviceState.blower) {
      fbxObj = blowerWinFbx
      devType = 'blowerWindow'
      win3d.openUpward = false
    } else if (!('fan' in deviceState)) { // ac feature
      console.log('loaded ac')
      devType = 'ac'
      fbxObj = acFbx
    }
    device3DList.value[deviceState.id] = win3d
    const winMesh = fbxObj.clone();
    // winMesh.rotation.y += Math.PI
    // 注意：旋转后记得更新一下矩阵，再进行后续的包围盒和转轴计算
    // winMesh.updateMatrixWorld(true)

    const [movingParts, blowerBladeMesh] = loadMovingMeshes(devType, winMesh)
    // const movingParts = parts
    // const blowerBladeMesh = bladeMesh
    // 将运动部件安全吸附到运动组
    win3d.blowerBladeMesh = blowerBladeMesh ? markRaw(blowerBladeMesh) : null

    const windowGroup = new THREE.Group()
    winMesh.position.copy(windowPosObj[deviceState.id].pos3D);
    winMesh.add(windowGroup)
    // scene.add(winMesh)
    if (southIds.includes(deviceState.id)) {
      southWallGroup.add(winMesh)
    } else {
      northWallGroup.add(winMesh)
    }
    // activeWinMeshes.push(winMesh)
    if (movingParts.length == 0) {
      // AC has no window m oving meshes except blade
      return
    }
    movingParts.forEach((part) => {
      windowGroup.attach(part)
    })

    // const boxHelper = new THREE.BoxHelper(windowGroup, 0xff0000);
    // scene.add(boxHelper);
    win3d.group = markRaw(windowGroup)

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
  })
  scene.add(southWallGroup, northWallGroup)
  console.log('in init3d device3dlist:', device3DList.value)
}

const testDevicesForDebug = () => {
  // writing for test
  let testDevIds = new Set([2, 3, 12, 11])
  // device3DList.forEach((item, index) => {
  store.windowStateList.forEach((item) => {
    if (testDevIds.has(item.id)) {
      // item.status = 1
      // item?.['blower']?.['status'] = 1
    } else if (item.id == 4) {
      // item.status = 2
      // item?.fan?.status = 1
    }
  })
}
// writing for test


const modelCache = {}
const loadModel = (async devType => {
  // if (modelCache[devType]) {
  //   return modelCache[devType]
  // }
  const fbx = await loader.loadAsync(`/asset/${devType}.fbx`)
  const size = 0.016
  fbx.scale.set(size, size, size)
  fbx.rotation.y = Math.PI / 2
  if (devType == 'ac') {
    fbx.rotation.y -= Math.PI
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
  // modelCache[devType] = wrapper

  // return [fbx, wrapper]
  return wrapper
})

const clock = new THREE.Clock();


const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  const delta = clock.getDelta();
  // console.log('rawDevList:', rawDevList)
  // console.log('fulldevs:', fullDevList.value, 'activtab: ', activeTab.value)
  // 1. 窗戶動畫：高速渲染迴圈直接讀寫普通變數的屬性，效率最高
  // console.log('active list:', activeDevIdList.value)
  // return
  fullDevList.value.forEach(winStateItem => {
    // tab切换后，invisible那面的墙的动画被停止了
    if (!activeDevIdList.value.has(winStateItem.id)) {
      return
    }
    const win3DItem = device3DList.value[winStateItem.id]
    // console.log('win3DItem:',  win3DItem, " winStateItem ", winStateItem)
    if (win3DItem.group) {
      if (winStateItem.status === 1) {
        win3DItem.currentAngle += speed * delta;
        if (win3DItem.currentAngle >= maxAngle) {
          win3DItem.currentAngle = maxAngle
        }
      } else if (winStateItem.status === 2) {
        // hard code for now, fix later
        // if (windowItem.currentAngle == 0) {
        //   windowItem.currentAngle = maxAngle
        // }
        // hard code for now, fix later
        win3DItem.currentAngle -= speed * delta;
        if (win3DItem.currentAngle <= 0) {
          win3DItem.currentAngle = 0
        }
      }
      else if (winStateItem.status === 4) {
        win3DItem.currentAngle = maxAngle
      } else if (winStateItem.status === 5) {
        win3DItem.currentAngle = 0
      }
      // 驅動 3D 群組旋轉
      if (win3DItem.openUpward) {
        win3DItem.group.rotation.x = -win3DItem.currentAngle //往上开,本应是rotation.x，这里是局部x轴
      } else {
        win3DItem.group.rotation.y = -win3DItem.currentAngle //往侧边开
      }
    }

    // 2. 風扇動畫
    // if (windowItem.blowerBladeMeshList.length > 0) {
    if (win3DItem.blowerBladeMesh) {
      const blowerStatus = winStateItem?.blower?.status ?? winStateItem?.fan?.status;
      // windowItem.blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
      if (blowerStatus == 1 || blowerStatus == 2) {
        // console.log('running blades', currentSpeed)
        if (currentSpeed < maxSpeed) {
          currentSpeed += acceleration
        }
        // console.log('windowItem.blowerBladeMesh.rotation.x: ', windowItem.blowerBladeMesh.rotation.x, ' winItem:', windowItem)
      } else if (blowerStatus == 3) {
        if (currentSpeed > 0) {
          currentSpeed -= acceleration
        }
        if (currentSpeed < 0) {
          currentSpeed = 0
        }
      }

      if (currentSpeed > 0) {
        // 直接改變 X 軸角度
        if (blowerStatus == 1) {//正转
          win3DItem.blowerBladeMesh.rotation.x -= currentSpeed
          // 防止數值無限增大卡死，滿一圈重置
          if (win3DItem.blowerBladeMesh.rotation.x < -Math.PI * 2) {
            win3DItem.blowerBladeMesh.rotation.x += Math.PI * 2
          }
        } else if (blowerStatus == 2) {//反转
          win3DItem.blowerBladeMesh.rotation.x += currentSpeed
          // 防止數值無限增大卡死，滿一圈重置
          if (win3DItem.blowerBladeMesh.rotation.x > Math.PI * 2) {
            win3DItem.blowerBladeMesh.rotation.x -= Math.PI * 2
          }
        }
      }
    }
  })


  // 更新 3D 控制器与渲染
  if (controls) {
    controls.update();
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
  project3DToScreen()
};

const partsCache = {}
const movingMeshesSet = new Set(['g1', 'g2', 'k', 'd1', 'd2', 'd3']);
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
      if (movingMeshesSet.has(child.name)) {
        console.log('adding child', child)
        movingParts.push(child)
      }
      else if (child.name === 'fengshan') {
        //  核心修复代码：开启双面渲染
        if (child.material) {
          child.material.side = THREE.DoubleSide
        }
        blowerBladeMesh = child
      }
    }
  })


  // return partsCache[devType]
  // const partsClone = []
  // movingParts.forEach(part => {
  //   const partClone = part.clone()
  //   partClone.position.set(0, 0, 0)
  //   partClone.rotation.set(0, 0, 0)
  //   partClone.scale.set(1, 1, 1)
  //   // partClone.position.set(0, 0, 0)

  //   const box = new THREE.Box3().setFromObject(partClone);
  //   //   console.log('box', box)
  //   const center = box.getCenter(new THREE.Vector3());
  //   console.log('center', center)
  //   // 将模型内部网格拉回原点（如果希望底部贴地，y 可以用 box.min.y）

  //   partClone.position.sub(center);
  //   partsClone.push(partClone)
  // })
  // partsCache[devType] = [partsClone, blowerBladeMesh ? blowerBladeMesh.clone() : blowerBladeMesh]
  // return partsCache[devType]
  return [movingParts, blowerBladeMesh]
})


let socket = null
let isExplicitlyClosed = false
const initWebSocket = () => {
  socket = new WebSocket(`ws-api/ws/dev-state/${selectedHouseCode.value}`);

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

onMounted(async () => {

})


const project3DToScreen = () => {
  dev3DPosList.value.forEach((win, index) => {
    // console.log('dev3dpos: ',win)
    if (!activeDevIdList.value.has(win.id)) {
      win.isPresented = false
      return
    }
    // 1. 复制该窗户的固定的 3D 世界坐标
    tempPosition.copy(win.pos3D);
    scene.localToWorld(tempPosition)

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

    // 5. 在屏幕范围内则显示
    win.isPresented = true
  })
}


const initThree = async () => {

  // 初始化 Three.js 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#f1f5f9');

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.5, 16);
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
  const wallGeo = new THREE.BoxGeometry(25, 12, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.7 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wallGeo.computeBoundingBox();
  wallMinx = wallGeo.boundingBox.min.x
  wallMaxX = wallGeo.boundingBox.max.x
  wallTopY = wallGeo.boundingBox.max.y


  wall.position.y += 2
  console.log('wallminx', wallMinx, 'walltopY', wallTopY)
  scene.add(wall);

  // 创建 地面
  const floorGeo = new THREE.PlaneGeometry(30, 15);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  console.log('floor pos:', floor.position)

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4;
  floorGeo.computeBoundingBox();
  // floorBottom= floorGeo.boundingBox.min.y
  floorBottom = floor.position.y
  console.log('floorbottom:', floorBottom)
  floor.receiveShadow = true;
  scene.add(floor);
  //整体左移3个单位
  scene.position.x -= 3

  // 创建 3D 窗户并加入场景
  // const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.3);
  // const windowMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 });

  // 监听窗口大小变化并启动动画
  window.addEventListener('resize', handleResize);
  // animate();
}
const windowCount = 5


const dev3DPosList = computed(() => {

  const windowSpaceX = (wallMaxX - wallMinx - 5 * windowWidth) / windowCount + 0.3
  console.log('windowWidth', windowWidth, ' wall width', wallMaxX - wallMinx, 'spacex: ', windowSpaceX)
  const baseWinVector = new THREE.Vector3(wallMinx + 1.5, wallTopY + 0.5, 0.05)
  const baseACVectors = [new THREE.Vector3(-8.5, 3.5, 0.05), new THREE.Vector3(6.9, 3.5, 0.05)]
  let j = 0
  return fullDevList.value.map(window => {
    let pos = baseWinVector.clone()
    let i = window.id
    if (i == 6 || i == 11 || i == 15) {
      // pos.x = baseVector.x
      j = 0
    }
    if (i >= 11) {
      // pos.y = -1.5 // y轴下移2个单位
      pos.y = floorBottom + 1.5
      console.log('id', i, 'pos.x: ', pos.x)
      pos.x += j * 1 + 0.5
    }

    pos.x += j * (windowSpaceX + windowWidth) //x方向隔3个单位
    if (i > 32) { //ac
      pos = baseACVectors[i - 33]
    }
    const windowPos = reactive({ id: i, title: '窗户' + i, pos3D: pos, screenX: 0, screenY: 0, isPresented: false })
    windowPosObj[i] = windowPos
    j++
    return windowPos
  })
})

onBeforeUnmount(() => {
  // 组件销毁时清除定时器与监听，防止内存泄漏
  cancelAnimationFrame(animationFrameId);
  if (scene)
    clearScene(false)
  window.removeEventListener('resize', handleResize);
  if (controls) controls.dispose();
  if (renderer) renderer.dispose();
  if (socket) {
    isExplicitlyClosed = true
    socket.close()
  }
})
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
  padding: 5px 5px;
  background-color: #021016;
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
  box-shadow: 0 4px 16px rgba(146, 33, 33, 0.04);
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