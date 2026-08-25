<template>
  <div class="container">
    <!-- 🟢 左侧：智能粮仓控制菜单 -->
    <div class="control-panel">
      <h2>🌾 智慧粮仓控制系统</h2>
      
      <!-- 通风口控制组 -->
      <div class="control-group">
        <h3>🌀 通风口控制 (旋转开启)</h3>
        <div class="btn-row">
          <button @click="toggleVent(1, true)" :class="{ active: vent1Open }">1号开启</button>
          <button @click="toggleVent(1, false)" :class="{ 'btn-off': !vent1Open }">1号关闭</button>
        </div>
        <div class="btn-row">
          <button @click="toggleVent(2, true)" :class="{ active: vent2Open }">2号开启</button>
          <button @click="toggleVent(2, false)" :class="{ 'btn-off': !vent2Open }">2号关闭</button>
        </div>
      </div>

      <!-- 电动窗控制组 -->
      <div class="control-group">
        <h3>🪟 电动窗控制 (平移滑开)</h3>
        <div class="btn-row">
          <button @click="toggleWindow(1, true)" :class="{ active: window1Open }">1号开窗</button>
          <button @click="toggleWindow(1, false)" :class="{ 'btn-off': !window1Open }">1号关窗</button>
        </div>
        <div class="btn-row">
          <button @click="toggleWindow(2, true)" :class="{ active: window2Open }">2号开窗</button>
          <button @click="toggleWindow(2, false)" :class="{ 'btn-off': !window2Open }">2号关窗</button>
        </div>
      </div>
    </div>

    <!-- 🔵 右侧：3D 画布容器 -->
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js' // 引入动画库

// --- 1. Vue 响应式状态（控制按钮激活样式） ---
const canvasContainer = ref(null)
const vent1Open = ref(false)
const vent2Open = ref(false)
const window1Open = ref(false)
const window2Open = ref(false)

// --- 2. Three.js & 3D 变量 ---
let scene, camera, renderer, animationFrameId
let vent1, vent2, window1, window2 // 存储 3D 部件对象

// --- 3. 初始化 3D 场景与简易粮仓模型 ---
const initThree = () => {
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#222629')

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 0, 8) // 相机正对墙面

  // 💡 添加灯光（为了立体感）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 5, 5)
  scene.add(dirLight)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  canvasContainer.value.appendChild(renderer.domElement)

  // 🧱 3D 建模：简易粮仓一面墙 (灰色大方块)
  const wallGeo = new THREE.BoxGeometry(6, 4, 0.2)
  const wallMat = new THREE.MeshStandardMaterial({ color: '#86c232' }) // 粮仓代表色：浅绿/灰
  const wall = new THREE.Mesh(wallGeo, wallMat)
  scene.add(wall)

  // 🌀 3D 建模：创建两个通风口 (圆形，开启表现为绕中心轴自转)
  const ventGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32)
  const ventMat1 = new THREE.MeshStandardMaterial({ color: '#474b4f' })
  
  vent1 = new THREE.Mesh(ventGeo, ventMat1)
  vent1.rotation.x = Math.PI / 2 // 让圆柱平贴在墙面上
  vent1.position.set(-1.5, -1, 0.15) // 左下角
  scene.add(vent1)

  vent2 = vent1.clone()
  vent2.position.set(1.5, -1, 0.15) // 右下角
  scene.add(vent2)

  // 🪟 3D 建模：创建两个电动窗 (方形，开启表现为向上平移滑开)
  const winGeo = new THREE.BoxGeometry(0.8, 0.8, 0.05)
  const winMat = new THREE.MeshStandardMaterial({ color: '#61892f', transparent: true, opacity: 0.8 })
  
  window1 = new THREE.Mesh(winGeo, winMat)
  window1.position.set(-1.5, 1, 0.15) // 左上角
  scene.add(window1)

  window2 = window1.clone()
  window2.position.set(1.5, 1, 0.15) // 右上角
  scene.add(window2)

  // 🔄 渲染与动画循环
  const animate = (time) => {
    animationFrameId = requestAnimationFrame(animate)
    
    TWEEN.update(time) // 💡 必须：实时更新补间动画

    // 持续交互效果：如果通风口是开启状态，让它像风扇一样持续微微旋转
    if (vent1Open.value) vent1.rotation.z += 0.05
    if (vent2Open.value) vent2.rotation.z += 0.05

    renderer.render(scene, camera)
  }
  animate()
}

// --- 4. 核心交互逻辑（用 TWEEN 制作平滑动画） ---

// 🌀 交互 1：通风口开关
const toggleVent = (id, open) => {
  if (id === 1) vent1Open.value = open
  if (id === 2) vent2Open.value = open

  // 这里可以拓展：比如开启时通过 TWEEN 改变材质颜色从灰变蓝，代表有风吹出
  const targetVent = id === 1 ? vent1 : vent2
  new TWEEN.Tween(targetVent.material.color)
    .to(open ? new THREE.Color('#47a3ff') : new THREE.Color('#474b4f'), 500)
    .start()
}

// 🪟 交互 2：电动窗开关 (修改 position.y 实现滑窗)
const toggleWindow = (id, open) => {
  const targetWin = id === 1 ? window1 : window2
  const isCurrentlyOpen = id === 1 ? window1Open.value : window2Open.value
  
  if (isCurrentlyOpen === open) return // 状态没变则不重复执行动画

  if (id === 1) window1Open.value = open
  if (id === 2) window2Open.value = open

  // 基础 Y 轴位置是 1。开启时往上滑到 1.6，关闭时滑回 1
  const targetY = open ? 1.6 : 1

  // 🎯 使用 TWEEN 平滑改变 Y 轴坐标
  new TWEEN.Tween(targetWin.position)
    .to({ y: targetY }, 800) // 800毫秒完成动画
    .easing(TWEEN.Easing.Cubic.Out) // 先快后慢的过渡曲线
    .start()
}

// --- 5. 生命周期管理 ---
onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  if (renderer) renderer.dispose()
})

const handleResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
</script>

<style scoped>
.container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #1a1a1d;
  color: #fff;
  font-family: 'PingFang SC', sans-serif;
}

.control-panel {
  width: 320px;
  background: #222629;
  padding: 25px;
  box-shadow: 4px 0 15px rgba(0,0,0,0.5);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 30px;
  border-right: 1px solid #474b4f;
}

h2 {
  font-size: 20px;
  color: #86c232;
  margin-bottom: 10px;
}

.control-group {
  background: #1a1a1d;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #474b4f;
}

h3 {
  font-size: 14px;
  margin-top: 0;
  margin-bottom: 15px;
  color: #61892f;
}

.btn-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.btn-row:last-child {
  margin-bottom: 0;
}

button {
  flex: 1;
  background: #474b4f;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
}

button:hover {
  background: #61892f;
}

/* 状态激活样式 */
button.active {
  background: #86c232;
  color: #000;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(134, 194, 50, 0.5);
}

button.btn-off {
  background: #e74c3c;
  color: white;
  font-weight: bold;
}

.canvas-container {
  flex: 1;
  height: 100%;
}
</style>
