<template>
  <!-- 3D 渲染和 HTML UI 的统一容器 -->
  <div id="canvas-container" ref="containerRef"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// 核心：引入 2D DOM 渲染器
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// 获取容器的 DOM 引用
const containerRef = ref(null);

let scene, camera, renderer, labelRenderer, controls, animationFrameId;
let windowMesh; // 窗户模型

onMounted(() => {
  initThree();
  animate();
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  // 组件销毁时，清理动画和事件监听，防止内存泄漏
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if (controls) controls.dispose();
  if (renderer) renderer.dispose();
});

function initThree() {
  const container = containerRef.value;
  if (!container) return;

  // 1. 创建场景
  scene = new THREE.Scene();

  // 2. 创建相机
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  // 3. 创建 WebGL 渲染器 (渲染 3D 场景)
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // 4. 关键：创建 CSS2D 渲染器 (负责把 HTML 按钮贴进 3D 空间)
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';
  // 关键：让 CSS2D 层的鼠标事件默认穿透，只有碰到按钮时才响应
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  // 5. 添加控制器（允许鼠标旋转、缩放视角）
  // 注意：控制器要绑定在 labelRenderer 的 DOM 上，否则会被透明层挡住
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 6. 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // 7. 建造一个简易的 3D 墙体和窗户（代替你的实际模型）
  createSceneModels();

  // 8. 关键：创建 HTML 按钮并挂载到窗户旁
  create3DMenu();
}

function createSceneModels() {
  // 创建一堵大墙 (灰色)
  const wallGeo = new THREE.BoxGeometry(4, 2.5, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  // wall.position.set(0,0,0)
  scene.add(wall);

  // 创建一个窗户 (蓝色透明，放在墙中心)
  const windowGeo = new THREE.BoxGeometry(1.5, 1.2, 0.25);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.6
  });
  windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.set(0, 0, 0);
  scene.add(windowMesh);
}

function create3DMenu() {
  // 步骤 A: 用原生 JS 创建标准的 HTML 结构（可以自由绑定 Vue 中的业务逻辑）
  const uiDiv = document.createElement('div');
  uiDiv.className = 'window-ui-container';

  // 创建“开窗”按钮
  const btnOpen = document.createElement('button');
  btnOpen.className = 'window-btn';
  btnOpen.innerText = 'Vue 触发: 打开';
  btnOpen.onclick = function () {
    // 这里可以调用普通的 JS/Vue 逻辑
    alert('【Vue 逻辑执行】窗户已开启');
    // 改变 3D 材质颜色
    windowMesh.material.color.setHex(0x00ff00);
  };

  // 创建“关窗”按钮
  const btnClose = document.createElement('button');
  btnClose.className = 'window-btn close';
  btnClose.innerText = 'Vue 触发: 关闭';
  btnClose.onclick = function () {
    alert('【Vue 逻辑执行】窗户已关闭');
    windowMesh.material.color.setHex(0x00aaff);
  };

  // 组装 DOM
  uiDiv.appendChild(btnOpen);
  uiDiv.appendChild(btnClose);

  // 步骤 B: 使用 CSS2DObject 将 HTML 包裹成 3D 空间对象
  const htmlLabel = new CSS2DObject(uiDiv);

  // 步骤 C: 设置按钮在 3D 空间中的相对位置 (窗户右侧)
  htmlLabel.position.set(1.2, 0, 0.1);

  // 步骤 D: 将按钮对象作为子节点，“钉”在窗户模型上
  windowMesh.add(htmlLabel);
}

function onWindowResize() {
  const container = containerRef.value;
  if (!container) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  if (controls) controls.update();

  // 关键：必须同时渲染 3D 场景和 2D HTML 标签层
  if (renderer && scene && camera) renderer.render(scene, camera);
  if (labelRenderer && scene && camera) labelRenderer.render(scene, camera);
}
</script>

<style scoped>
/* 容器全屏铺满 */
#canvas-container {
  width: 50vw;
  height: 50vh;
  position: relative;
  background-color: #1a1a1a;
  overflow: hidden;
}

/* 
  使用 :deep() 穿透作用域：
  因为按钮是用原生 JS 动态生成的，默认不带有 Vue 的 data-v 属性，
  必须用 :deep 才能让样式在这些动态节点上生效。
*/
#canvas-container :deep(.window-ui-container) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #555;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  /* pointer-events: auto; */
  /* 允许点击 */
  pointer-events: auto !important;
  /* 强制开启点击，把点击权从大透明层抢回来 */
  z-index: 9999 !important;
}

#canvas-container :deep(.window-btn) {
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
  white-space: nowrap;
  pointer-events: auto !important;
}

#canvas-container :deep(.window-btn:hover) {
  background: #45a049;
}

#canvas-container :deep(.window-btn.close) {
  background: #f44336;
}

#canvas-container :deep(.window-btn.close:hover) {
  background: #da190b;
}
</style>
