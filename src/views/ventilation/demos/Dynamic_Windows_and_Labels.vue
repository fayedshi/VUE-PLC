<template>
  <div class="scene-container">
    <!-- 3D 渲染画布 -->
    <canvas ref="canvasRef" class="webgl-canvas"></canvas>

    <!-- HTML 菜单图层：由数据驱动自动渲染 -->
    <div class="ui-container">
      <div v-for="win in windows" :key="win.id" v-show="win.isPresented" class="window-menu" :style="{
        transform: `translate3d(${win.screenX}px, ${win.screenY}px, 0) translate(-50%, -120%)`
      }">
        <h4>{{ win.title }}</h4>
        <button @click="handleAction(win.title)">开启</button>
      </div>
    </div>

    <div class="instructions">Vue 3 数据驱动：按住鼠标拖拽旋转视角</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useWindowControlStore } from '../../../store/WindowControl.ts'

// --- 1. 响应式数据定义（核心管理池） ---
const canvasRef = ref(null);
// const windows = ref([
//   { id: 1, title: '左侧窗户', pos3D: new THREE.Vector3(-8, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
//   { id: 2, title: '中间窗户', pos3D: new THREE.Vector3(-5, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
//   { id: 3, title: '右侧窗户', pos3D: new THREE.Vector3(-2, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false }
// ]);

const windows = computed(() => {
  const windowList = {}
  const baseVector = new THREE.Vector3(-8, 2.5, 0.05)
  for (let i = 1, j = 0; i <= 14; i++, j++) {
    let pos = baseVector.clone()

    if (i == 6 || i == 11) {
      // pos.x = baseVector.x
      j = 0
    }
    if (i >= 11) {
      pos.y = baseVector.y - 3 // y轴下移2个单位
      console.log('id', i, 'pos.x: ', pos.x)
    }
    pos.x += j * 3 //x方向隔3个单位
    windowList[i] = { id: i, title: '窗户' + i, pos3D: pos, screenX: 0, screenY: 0, isPresented: false }
  }
  return windowList
})


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
const speed = 0.0058
const maxSpeed = 0.12
const acceleration = 0.003


// --- 4. 按钮点击事件 ---
const handleAction = (title) => {
  alert(`Vue 3 触发：${title}已开启`);
};

// --- 5. 处理窗口缩放 ---
const handleResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const southWindowList = computed(() => {
  return store.windowStateList.filter(window => [1, 2, 3, 4, 5, 11, 12, 13, 14, 33, 34].includes(window.id))
  // return store.windowStateList.filter(window => [2].includes(window.id))
})


const loader = new FBXLoader()
const device3DList = {}

const init3DWindows = async () => {
  const fanWinFbx = await loadModel('damper_blower')
  const simpleWinFbx = await loadModel('window')

  southWindowList.value.forEach(winState => {
    let fbxObj = simpleWinFbx
    console.log('fbxobj:', fbxObj)
    let win3d = reactive({
      id: winState.id,
      status: winState.status,       // 'closed', 'opening', 'open', 'closing', 'stopped'
      currentAngle: 0,
      group: null,           // 存放 THREE.Group
      // windowMeshList: [],       // 存放真實 THREE.Mesh
      // windowMeshList: markRaw([]),
      blowerBladeMesh: null,
      blowerState: -1,
      openUpward: true,
      fan: null,
      blower: null
    })
    if (winState.fan) {
      win3d.blowerState = winState.fan.status
      win3d.fan = winState.fan
      fbxObj = fanWinFbx
    } else if (winState.blower) {
      fbxObj = fanWinFbx
      win3d.blowerState = winState.blower.status
      win3d.openUpward = false
      win3d.blower = winState.blower
    }
    device3DList[winState.id] = win3d

    const winMesh = fbxObj.clone();
    // winMesh.rotation.y += Math.PI
    // 注意：旋转后记得更新一下矩阵，再进行后续的包围盒和转轴计算
    // winMesh.updateMatrixWorld(true)

    const [movingParts, blowerBladeMesh] = loadMovingMeshes(winMesh)
    // 将运动部件安全吸附到运动组
    const windowGroup = new THREE.Group()
    winMesh.position.copy(windows.value[winState.id].pos3D);
    winMesh.add(windowGroup)
    movingParts.forEach((part) => {
      windowGroup.attach(part) // attach之后windowgroup才有坐标，否则是0，0，0
    })

    const boxHelper = new THREE.BoxHelper(windowGroup, 0xff0000);
    scene.add(boxHelper);
    win3d.group = windowGroup
    win3d.blowerBladeMesh = blowerBladeMesh

    const box = new THREE.Box3().setFromObject(windowGroup)
    //box3算出来的是世界坐标，如果此时winmesh不在原点，则需要转换成局部坐标再赋值
    // movingParts.forEach((part) => {
    //   part.updateMatrixWorld(true)
    //   box.expandByObject(part)
    // })

    // let xVal = win3d.openUpward ? box.max.x : box.min.x
    // const worldPivot = new THREE.Vector3(xVal, box.max.y, box.min.z) // 左侧开
    const worldPivot = new THREE.Vector3(box.min.x, (box.min.y + box.max.y) / 2, box.min.z) // 往上开
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
    scene.add(winMesh)

    // store.acStateList.forEach(acState => {
    //   device3DList[acState.id] = reactive({
    //     id: acState.id,
    //     group: null,
    //     blowerBladeMesh: null,
    //     blowerState: -1,
    //   })
    // })
  })
  // writing for test
  device3DList[2].status = 1
  device3DList[2].blowerState = 1
  device3DList[3].status = 1
  device3DList[3].blowerState = 1
  device3DList[4].status = 1
  device3DList[4].blowerState = 1
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
  const size = 0.015
  fbx.scale.set(size, size, size)
  fbx.rotation.y = Math.PI / 2

  const box = new THREE.Box3().setFromObject(fbx);
  //   console.log('box', box)
  const center = box.getCenter(new THREE.Vector3());
  console.log('center', center)
  // 将模型内部网格拉回原点（如果希望底部贴地，y 可以用 box.min.y）

  fbx.position.sub(center);
  const wrapper = new THREE.Group();
  wrapper.add(fbx);

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
        windowItem.group.rotation.y = -windowItem.currentAngle //往上开,本应是rotation.x，这里是局部x轴
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
  // controls.update()
  // 1. 渲染 3D 模型
  // if (renderer && scene && camera)
  //   renderer.render(scene, camera);

  // // 2. 核心：必须加上这行来渲染 HTML 按钮
  // if (labelRenderer && scene && camera)
  //   labelRenderer.render(scene, camera);
  // // renderer.render(scene, camera)


  // 更新 3D 控制器与渲染
  if (controls) controls.update();
  if (renderer && scene && camera)
    renderer.render(scene, camera);

  // 遍历数据源，计算 2D 投影坐标
  Object.values(windows.value).forEach((win) => {
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

    // 5. 在屏幕范围内则显示
    win.isPresented = true;


  });
};



const loadMovingMeshes = (fbx => {
  // const winMeshGroup = new THREE.Group()
  let blowerBladeMesh = null
  const movingParts = []
  fbx.traverse(child => {
    if (child && child.isMesh) {
      const parentName = child.parent ? child.parent.name : null
      console.log('发现窗户部件:', child.name, 'parent:', parentName)
      // 收集需要动的部件
      if (
        ['v', 'v2', '0_2', '2', 'BT_DLSZD_03',
          'BT_RJCHY_01_02', 'BT_RJCHY_01_02_instance'
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
  return [movingParts, blowerBladeMesh]
})

// --- 6. 生命周期钩子 ---
onMounted(async () => {
  await Promise.all([
    store.initDeviceConfig('001'),
    // initWebSocket()
  ]
  )

  // 初始化 Three.js 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);
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
  const wallGeo = new THREE.BoxGeometry(15, 8, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(-1, -0.2, 0);
  scene.add(wall);

  // 创建 地面
  const floorGeo = new THREE.PlaneGeometry(18, 18);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -(8 / 2);
  floor.receiveShadow = true;
  scene.add(floor);


  // 创建 3D 窗户并加入场景
  const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.3);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 });

  await init3DWindows()
  // const loader = new FBXLoader()
  // loader.load('/asset/damper_blower.fbx', (fbx) => {
  //   const size = 0.015
  //   fbx.scale.set(size, size, size)
  //   fbx.rotation.y = Math.PI / 2

  //   const box = new THREE.Box3().setFromObject(fbx);
  //   //   console.log('box', box)
  //   const center = box.getCenter(new THREE.Vector3());
  //   console.log('center', center)
  //   // 将模型内部网格拉回原点（如果希望底部贴地，y 可以用 box.min.y）

  //   const boxHelper = new THREE.BoxHelper(fbx, 0xff0000);
  //   scene.add(boxHelper);

  //   fbx.position.sub(center);
  //   const wrapper = new THREE.Group();
  //   wrapper.add(fbx);
  //   // wrapper.position.copy(windows.value[0].pos3D); // 现在 wrapper 的位置就是模型真实的几何中心
  //   // scene.add(wrapper);
  //   // fbx.position.copy(windows[0].pos3D)
  //   // scene.add(fbx)

  //   windows.value.forEach((win) => {
  //     // const winMesh = new THREE.Mesh(windowGeo, windowMat);
  //     const winMesh = wrapper.clone();

  //     // console.log('winmesh pos:', winMesh.position)
  //     winMesh.position.copy(win.pos3D);
  //     console.log('winmesh pos latest:', winMesh.position)
  //     scene.add(winMesh);
  //   })
  // })



  // 监听窗口大小变化并启动动画
  window.addEventListener('resize', handleResize);
  animate();
});

onUnmounted(() => {
  // 组件销毁时清除定时器与监听，防止内存泄漏
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', handleResize);
  if (controls) controls.dispose();
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
}

.webgl-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.ui-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  /* 允许鼠标事件穿透到 3D 场景 */
}

.window-menu {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(30, 30, 30, 0.85);
  color: white;
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #444;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  /* 恢复菜单自身的点击事件 */
  width: 120px;
  will-change: transform;
  /* 优化 GPU 渲染性能 */
}

.window-menu h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #00ffcc;
}

.window-menu button {
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.window-menu button:hover {
  background: #0056b3;
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
}
</style>
