<template>
  <!-- 3D 渲染的容器 -->
  <div ref="sceneContainer" class="scene-container"></div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useWindowControlStore } from '../../store/WindowControl.ts' // 沿用上一轮回答的 Pinia Store
import WindowCard from '../../components/WindowCard.vue'

const isLoading = ref(true)
const store = useWindowControlStore()

// 获取 DOM 容器
const sceneContainer = ref(null);

// ==========================================
// 1. 模拟 状态管理库 (Store) 与 动态设备列表
// ==========================================

// 核心动态设备 3D 状态字典
const device3DList = {};

// 动力学控制参数
const speed = 0.01;         // 窗户开合速度
const maxAngle = Math.PI / 3; // 窗户最大打开角度 (60度)
let currentSpeed = 0.05;    // 当前风扇转速
const maxSpeed = 0.2;       // 风扇最大转速
const acceleration = 0.002; // 风扇加速度

// 墙体尺寸定义
const warehouseData = {
  wallLength: 50,
  wallHeight: 36,
  wallWidth: 0.8,
};

let renderer, scene, camera, animationFrameId;

// ==========================================
// 2. 初始化设备数据并构建 3D 模型
// ==========================================
const init3DWindows = () => {
  // 处理窗户设备
  store.windowStateList.forEach((winState, index) => {
    let win3d = {
      id: winState.id,
      state: winState.status, 
      currentAngle: 0,
      group: null,            // 存放用于控制旋转的 THREE.Group
      windowMeshList: [], 
      blowerBladeMesh: null,  // 存放扇叶 Mesh
      blowerState: -1,
      openUpward: true
    };

    if (winState.fan) {
      win3d.blowerState = winState.fan.status;
    }
    if (winState.blower) {
      win3d.blowerState = winState.blower.status;
      win3d.openUpward = false; // 侧开
    }

    // --- 【核心】动态创建该窗户/风机的 3D 模型 ---
    const deviceGroup = createDeviceModel(win3d);
    
    // 自动计算空间分布坐标（均匀分布在墙面上）
    const totalDevices = store.windowStateList.length + store.acStateList.length;
    const posX = ((index + 0.5) / totalDevices - 0.5) * warehouseData.wallLength;
    const posY = 0; // 居中高度
    deviceGroup.position.set(posX, posY, 0);
    
    scene.add(deviceGroup);
    device3DList[winState.id] = win3d;
  });

  // 处理空调/独立风机设备
  store.acStateList.forEach((acState, index) => {
    let ac3d = {
      id: acState.id,
      blowerBladeMesh: null,
      blowerState: acState.status, // 假设同步状态
    };

    // 创建独立风机模型
    const deviceGroup = createDeviceModel(ac3d);
    
    // 同样计算分布位置（排在窗户后面）
    const totalDevices = store.windowStateList.length + store.acStateList.length;
    const winCount = store.windowStateList.length;
    const posX = (((winCount + index) + 0.5) / totalDevices - 0.5) * warehouseData.wallLength;
    const posY = 5; // 稍微抬高一点
    deviceGroup.position.set(posX, posY, 0);

    scene.add(deviceGroup);
    device3DList[acState.id] = ac3d;
  });
};

/**
 * 辅助函数：根据数据动态组装 3D 风机/窗户模型
 */
const createDeviceModel = (deviceObj) => {
  const rootGroup = new THREE.Group();

  // 1. 创建外壳/窗框
  const casingGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.4, 32);
  casingGeo.rotateX(Math.PI / 2); // 转向正对屏幕
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
  const casingMesh = new THREE.Mesh(casingGeo, casingMat);
  rootGroup.add(casingMesh);

  // 2. 创建风机扇叶
  const bladeGroup = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(2.4, 0.2, 0.1);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffb300 }); // 黄色扇叶
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  const blade2 = blade1.clone();
  blade2.rotation.z = Math.PI / 2; // 十字交叉
  bladeGroup.add(blade1, blade2);
  bladeGroup.position.z = 0.65; // 稍微向前移防止层级闪烁
  
  // 旋转扇叶轴心朝向：由于你原逻辑动态控制的是 rotation.x，我们将扇叶组旋转，使其 X 轴变为转轴
  bladeGroup.rotation.y = Math.PI / 2; 

  rootGroup.add(bladeGroup);
  
  // 将创建好的扇叶 Mesh 引用赋给数据对象，供 animate 驱动
  deviceObj.blowerBladeMesh = bladeGroup;

  // 3. 窗户逻辑：如果是窗户设备，为其建立旋转轴父组
  if (deviceObj.state !== undefined) {
    const pivotGroup = new THREE.Group();
    // 根据是向上开还是侧开，调整局部中心点（这里简化将整体作为旋转组）
    pivotGroup.add(rootGroup);
    deviceObj.group = pivotGroup;
    return pivotGroup;
  }

  return rootGroup;
};


onMounted(() => {
  // 1. 初始化 3D 基础环境
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f2f5);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  sceneContainer.value.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // 2. 绘制 3D 墙面
  const wallGeo = new THREE.BoxGeometry(warehouseData.wallLength, warehouseData.wallHeight, warehouseData.wallWidth);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.7 }); 
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  scene.add(wallMesh);

  // 地面
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -(warehouseData.wallHeight / 2);
  scene.add(floor);

  // 3. 【核心】执行动态数据载入
  init3DWindows();

  // ==========================================
  // 3. 动态驱动渲染动画循环 (Animate Loop)
  // ==========================================
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    // 遍历动态设备列表驱动动画
    Object.values(device3DList).forEach(windowItem => {
      
      // ----------- 1. 窗户开关控制逻辑 -----------
      if (windowItem.group) {
        if (windowItem.state === 1) { // opening
          windowItem.currentAngle += speed;
          if (windowItem.currentAngle >= maxAngle) {
            windowItem.currentAngle = maxAngle;
          }
        } else if (windowItem.state === 2) { // closing
          windowItem.currentAngle -= speed;
          if (windowItem.currentAngle <= 0) {
            windowItem.currentAngle = 0;
          }
        } else if (windowItem.state === 4) { // 全开
          windowItem.currentAngle = maxAngle;
        } else if (windowItem.state === 5) { // 全关
          windowItem.currentAngle = 0;
        }

        // 驱动 3D 群组选择开合方向
        if (windowItem.openUpward) {
          // 往上开：绑定到局部 Z 轴或 X 轴（根据你实际模型朝向调整）
          windowItem.group.rotation.z = -windowItem.currentAngle; 
        } else {
          // 往侧边开
          windowItem.group.rotation.y = -windowItem.currentAngle; 
        }
      }

      // ----------- 2. 风扇转速与正反转逻辑 -----------
      if (windowItem.blowerBladeMesh) {
        // 加速与减速控制
        if (windowItem.blowerState == 1 || windowItem.blowerState == 2) {
          if (currentSpeed < maxSpeed) {
            currentSpeed += acceleration;
          }
        } else if (windowItem.blowerState == 3) { // 停止中
          if (currentSpeed > 0) {
            currentSpeed -= acceleration;
          }
          if (currentSpeed < 0) {
            currentSpeed = 0;
          }
        }

        // 转动角度递增
        if (currentSpeed > 0) {
          if (windowItem.blowerState == 1) { // 正转
            windowItem.blowerBladeMesh.rotation.x -= currentSpeed;
            if (windowItem.blowerBladeMesh.rotation.x < -Math.PI * 2) {
              windowItem.blowerBladeMesh.rotation.x += Math.PI * 2;
            }
          } else if (windowItem.blowerState == 2) { // 反转
            windowItem.blowerBladeMesh.rotation.x += currentSpeed;
            if (windowItem.blowerBladeMesh.rotation.x > Math.PI * 2) {
              windowItem.blowerBladeMesh.rotation.x -= Math.PI * 2;
            }
          }
        }
      }
    });

    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener('resize', onWindowResize);
});

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

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
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.scene-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
