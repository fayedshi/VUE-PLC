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
const initialPositions = new Map()
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
  // 在 initThree 函数中设置
  scene.background = new THREE.Color(0xffffff) // 纯白色背景
  // 或者浅灰色，这样更容易看清白色模型
  scene.background = new THREE.Color(0xeeeeee)

  

  // 加载 3D 窗户模型
  const loader = new GLTFLoader()
  // loader.load('/asset/Window_slide.glb', (gltf) => {
  loader.load('/asset/Door.glb', (gltf) => {
    scene.add(gltf.scene)

    // 🎯 核心：找出模型里的“窗扇”网格（假设在建模软件里命名为 "Flap"）
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // 打印出每一个网格的名字
        console.log('网格名称:', child.name, '| 独立对象:', child)
      }
      if (child.isMesh && ['Sliding_door', 'Door_Handle'].includes(child.name)) {
        windowFlaps.push(child)
        initialPositions.set(child.uuid, child.position.x);
        console.log(`已锁定部件 [${name}]，记录初始 X 坐标: ${child.position.x}`);
      }
    })
  })
}

// 2. 动画渲染循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  // 速度系数：数值越大，开关门速度越快（0.05 约等于平滑滑动）
  const speed = 0.01;
  // 假设开门时，门和把手需要整体向 X 轴正方向平移 1.2 米
  const slideDistance = 1.2;

  windowFlaps.forEach(mesh => {
    // 获取当前部件的原始关门坐标
    const startX = initialPositions.get(mesh.uuid);
    if (startX === undefined) return;

    // 1. 动态计算当前部件的“目的地”
    let targetX = startX; // 默认目的地是：关门位置（状态 0 或其他）

    if (props.windowStatus === 1) {
      targetX = startX + slideDistance; // 如果状态是 1，目的地变成：开门位置
    }

    // 2. 区分处理门和把手（防止把手因为父子关系发生二次叠加位移）
    let shouldMove = false;

    if (mesh.name.includes('Sliding_door')) {
      shouldMove = true; // 门必然要自己移动
    }
    else if (mesh.name.includes('Door_Handle')) {
      // 只有当把手和门在场景树里平级（把手不是门的子节点）时，把手才需要自己写代码移动
      if (mesh.parent && !mesh.parent.name.includes('Sliding_door')) {
        shouldMove = true;
      }
    }

    // 3. 执行平滑的位移（开门和关门通用的缓动公式）
    if (shouldMove) {
      // 计算当前位置和目的地的距离差
      const deltaX = targetX - mesh.position.x;

      // 距离很近时直接吸附，防止浮点数无限震荡
      if (Math.abs(deltaX) < 0.001) {
        mesh.position.x = targetX;
      } else {
        mesh.position.x += deltaX * speed; // 慢慢向目的地靠拢
      }
    }
  });

  renderer.render(scene, camera)
}



// 监听状态变化（如果需要从其他状态切换回 1 时重置或触发）
watch(() => props.windowStatus, (newStatus) => {
  if (newStatus === 2) {
    console.log('窗户开始执行开启工作...')
    animate()
  }
})

onMounted(() => {
  initThree()
  animate()
})
</script>

<style scoped>
.canvas-container {
  width: 500;
  height: 400px;
}
</style>
