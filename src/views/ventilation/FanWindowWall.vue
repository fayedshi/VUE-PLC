<template>
  <!-- 3D 渲染的容器 -->
  <div ref="sceneContainer" class="scene-container"></div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 获取 DOM 容器
const sceneContainer = ref(null);

// 定义数据驱动的模拟接口数据（50米长、6米高的墙，上面有3个不同位置的风机）
const warehouseData = {
  wallLength: 50,
  wallHeight: 36,
  wallWidth: 0.8,
  fans: [
    { id: 'fan-1', xPercent: 0.2, yHeight: 24.7, speed: 0.05 }, // 靠左的风机
    { id: 'fan-2', xPercent: 0.5, yHeight: 22.5, speed: 0.08 }, //居中的风机
    { id: 'fan-3', xPercent: 0.8, yHeight: 32.5, speed: 0.03 }  // 靠右的风机
  ]
};

// 存储需要旋转的扇叶数组，方便在渲染循环中控制它们
const fanBladesToAnimate = [];
let renderer, scene, camera, animationFrameId;

onMounted(() => {
  // 1. 创建场景 (Scene)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f2f5); // 浅灰色背景

  // 2. 创建相机 (Camera)
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 40); // 抬高视线并后退，以便看清整堵墙

  // 3. 创建渲染器 (Renderer)
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // 开启阴影支持
  sceneContainer.value.appendChild(renderer.domElement);

  // 4. 加上轨道控制器 (OrbitControls) - 允许鼠标旋转、缩放查看
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 5. 添加光照 (Lighting)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 环境光
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); // 聚光灯，制造立体感
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // 6. 【核心】代码动态绘制 3D 墙面
  const wallGeo = new THREE.BoxGeometry(warehouseData.wallLength, warehouseData.wallHeight, warehouseData.wallWidth);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae }); // 灰蓝色墙面材质
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = true;
  scene.add(wallMesh);

  // 7. 【核心】数据驱动：循环拼装风机
  warehouseData.fans.forEach((fan) => {
    // 创建风机外壳（圆柱体）
    const casingGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.4, 32);
    // 旋转圆柱体使其平躺，正对我们
    casingGeo.rotateX(Math.PI / 2);
    const casingMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const casingMesh = new THREE.Mesh(casingGeo, casingMat);

    // 创建风机扇叶（这里用一个十字长条代替，实际用gltf模型克隆）
    const bladeGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(2, 0.2, 0.1);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffb300 }); // 黄色扇叶
    
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    const blade2 = blade1.clone();
    blade2.rotation.z = Math.PI / 2; // 垂直交叉形成十字
    bladeGroup.add(blade1, blade2);
    // 让扇叶略微往前移一点，防止与外壳贴面闪烁
    bladeGroup.position.z = 0.65; 

    // 把外壳和扇叶组合成一个“风机整体”
    const fanContainer = new THREE.Group();
    fanContainer.add(casingMesh, bladeGroup);

    // 计算风机在墙体上的具体 3D 坐标
    // 以墙体中心为零点：xPercent 从 0 到 1 映射到墙长
    const posX = (fan.xPercent - 0.5) * warehouseData.wallLength;
    // Y 轴高度需减去墙高度的一半
    const posY = fan.yHeight - (warehouseData.wallHeight / 2);
    // Z 轴让它嵌入墙面（墙厚度的一半）
    const posZ = 0; 

    fanContainer.position.set(posX, posY, posZ);
    scene.add(fanContainer);

    // 把需要旋转的扇叶以及它的运行速度存入数组
    fanBladesToAnimate.push({
      mesh: bladeGroup,
      speed: fan.speed
    });
  });

  // 添加一个地面用来承载阴影
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -(warehouseData.wallHeight / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // 8. 渲染与动画循环 (Animation Loop)
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    // 遍历所有风机，让它们的扇叶按各自的速度旋转起来
    fanBladesToAnimate.forEach((fan) => {
      fan.mesh.rotation.z += fan.speed;
    });

    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  // 监听窗口大小缩放
  window.addEventListener('resize', onWindowResize);
});

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// 销毁时清理内存，防止内存泄漏
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
  margin: 0;
  padding: 0;
}
</style>
