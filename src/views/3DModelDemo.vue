<template>
  <!-- 3D 渲染容器 -->
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const props = defineProps({
  windowStatus: { type: Number, default: 0 } // 传入的状态，4 代表正在开启
})

const canvasContainer = ref(null)
let windowFlaps = [] // 存储窗扇的 Mesh 对象
let renderer, scene, camera, animationFrameId

// 1. 初始化 Three.js 场景
const initThree = () => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 2, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  canvasContainer.value.appendChild(renderer.domElement)

  // 灯光
  const light = new THREE.AmbientLight(0xffffff, 1)
  scene.add(light)

  // 加载 3D 窗户模型
  const loader = new GLTFLoader()
  loader.load('/models/window.gltf', (gltf) => {
    scene.add(gltf.scene)
    
    // 🎯 核心：找出模型里的“窗扇”网格（假设在建模软件里命名为 "Flap"）
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.name.includes('Flap')) {
        windowFlaps.push(child)
      }
    })
  })
}

// 2. 动画渲染循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 🎯 核心逻辑：如果状态是 4 (正在开启)，每帧增加旋转角度，直到开满（如 1.5 弧度，约90度）
  if (props.windowStatus === 4) {
    windowFlaps.forEach(flap => {
      if (flap.rotation.y < 1.5) { 
        flap.rotation.y += 0.02 // 控制开启速度
      }
    })
  }

  renderer.render(scene, camera)
}

// 监听状态变化（如果需要从其他状态切换回 4 时重置或触发）
watch(() => props.windowStatus, (newStatus) => {
  if (newStatus === 4) {
    console.log('窗户开始执行开启工作...')
  }
})

onMounted(() => {
  initThree()
  animate()
})
</script>

<style scoped>
.canvas-container { width: 100%; height: 500px; }
</style>
