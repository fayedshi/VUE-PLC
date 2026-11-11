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
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- 1. 响应式数据定义（核心管理池） ---
const canvasRef = ref(null);
const windows = ref([
  { id: 1, title: '左侧窗户', pos3D: new THREE.Vector3(-3, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
  { id: 2, title: '中间窗户', pos3D: new THREE.Vector3(0, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false },
  { id: 3, title: '右侧窗户', pos3D: new THREE.Vector3(3, 2.5, 0.05), screenX: 0, screenY: 0, isPresented: false }
]);

// --- 2. Three.js 变量（无需响应式，避免性能损耗） ---
let scene, camera, renderer, controls, animationFrameId;
const tempPosition = new THREE.Vector3();

// --- 3. 核心计算与渲染循环 ---
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);

  // 更新 3D 控制器与渲染
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);

  // 遍历数据源，计算 2D 投影坐标
  windows.value.forEach((win) => {
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

// --- 6. 生命周期钩子 ---
onMounted(() => {
  // 初始化 Three.js 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);

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
  const wallGeo = new THREE.BoxGeometry(10, 5, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 2.5, 0);
  scene.add(wall);

  // 创建 3D 窗户并加入场景
  const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.3);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 });

  windows.value.forEach((win) => {
    const winMesh = new THREE.Mesh(windowGeo, windowMat);
    winMesh.position.copy(win.pos3D);
    scene.add(winMesh);
  });

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
