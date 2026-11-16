<template>
  <div class="window-container">
    <div ref="canvasContainer" class="canvas-container"></div>

    <div class="control-btn-group alignment-center">
      <el-button type="success" :icon="VideoPlay" @click="controlWindow('open')">开启</el-button>
      <el-button type="danger" :icon="SwitchButton" @click="controlWindow('close')">关闭</el-button>
      <el-button type="warning" :icon="VideoPause" @click="controlWindow('stop')">停止</el-button>
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

const canvasContainer = ref(null)

let scene, camera, renderer, controls, animationFrameId
let windowGroup = null // 运动组

// 窗户状态控制
const windowState = ref('closed')
const currentAngle = ref(0)
// 翻窗的打开角度通常不需要 90 度，这里设为 45 度 (Math.PI / 4) 看起来最自然，你可以根据需要调整
const maxAngle = Math.PI / 2
const speed = 0.02 // 翻转速度调慢一点，更平滑

let blowerBladeMesh = null
const isBlowerRunning = ref(false)

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
  camera.position.set(0, 2, 8);
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


  // 初始化 Three.js 场景
  // scene = new THREE.Scene();
  // scene.background = new THREE.Color(0x1a1a1a);

  // camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  // camera.position.set(0, 2, 8);
  // camera.lookAt(0, 0, 0);

  // renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true });
  // renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // controls = new OrbitControls(camera, renderer.domElement);
  // controls.enableDamping = true;

  // // 添加灯光
  // // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  // // scene.add(ambientLight);
  // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  // directionalLight.position.set(5, 10, 7);
  // scene.add(directionalLight);

  // 创建 3D 墙体
  const wallGeo = new THREE.BoxGeometry(15, 8, 0.1);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x556655 });
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

  loadWindowModel()
  animate()
}

const loadWindowModel = () => {
  const loader = new FBXLoader()

  windowGroup = new THREE.Group()

  loader.load('/asset/fan_window.fbx', (fbxObject) => {
    const size = 0.02
    fbxObject.scale.set(size, size, size)

    // 自转90度
    fbxObject.rotation.y = Math.PI / 2
    // 相机自动聚焦
    const fullBox = new THREE.Box3().setFromObject(fbxObject)
    const modelCenter = fullBox.getCenter(new THREE.Vector3())

    // const box = new THREE.Box3().setFromObject(fbxObject);
    // //   console.log('box', box)
    // const center = box.getCenter(new THREE.Vector3());
    // console.log('center', center)
    // // 将模型内部网格拉回原点（如果希望底部贴地，y 可以用 box.min.y）

    fbxObject.position.sub(modelCenter)
    fbxObject.position.z += 0.25

    scene.add(fbxObject)
    fbxObject.position.y += 1.2

    const movingParts = []
    // 是否开启风机的状态标识（联动你的业务数据，比如 status === 1）
    fbxObject.traverse((child) => {
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : null
        console.log('发现窗户部件:', child.name, 'parent:', parentName)

        // 收集需要动的部件
        if (
          [
            // 'Window_Animated_BaseUpper_V1',
            // 'Window_Animated_V1',
            // 'Window_Animated_Handle_V1',
            // 'Window_Animated_BaseLower_V1'
            'v',
            'v2',
            '0_2',
            '2',
            'BT_DLSZD_03',

            'BT_RJCHY_01_02',
            'BT_RJCHY_01_02_instance'
            // 'L',
            // 'BT_DDWC_RJ50_01_00',
          ].includes(child.name)
        ) {
          movingParts.push(child)
        }
        else if (child.name === 'fengshan') {
          blowerBladeMesh = child
          // blowerBladeMesh.geometry.center(); // 将几何体中心点移到自身本地坐标系的 (0,0,0)
          //  核心修复代码：开启双面渲染
          if (child.material) {
            child.material.side = THREE.DoubleSide
          }
        }
      }
    })


    fbxObject.add(windowGroup)

    // 将运动部件安全吸附到运动组
    movingParts.forEach((part) => {// 这些part原来就在fbxobject中，fbxobject开始上移2，这些part坐标继承了fbx的坐标，也会变
      windowGroup.attach(part)
    })

    const box = new THREE.Box3().setFromObject(windowGroup)
    const worldPivot = new THREE.Vector3(box.min.x, (box.min.y + box.max.y) / 2, box.min.z) // 往上开
    const localPivot = windowGroup.worldToLocal(worldPivot.clone())
    windowGroup.position.copy(localPivot)

    const boxHelper = new THREE.BoxHelper(windowGroup, 0xff0000);
    scene.add(boxHelper);
    movingParts.forEach((part) => {
      part.position.x -= windowGroup.position.x
      part.position.y -= windowGroup.position.y
      part.position.z -= windowGroup.position.z
    })


    // fbxObject.position.sub(modelCenter)

    // controls.target.copy(modelCenter)
    // 【新增安全机制】由于手动改了 target，最好让相机位置也基于中心点错开，防止镜头陷在模型里
    // camera.position.set(modelCenter.x - 60, modelCenter.y, modelCenter.z)
    // fbxObject.position.y += 1
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
