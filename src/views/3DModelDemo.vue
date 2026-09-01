<template>
  <!-- 3D 渲染容器 -->
  <div ref="container" style="width: 100%; height: 100vh;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 引入本地的 glb 模型（假设放在 src/assets/models/ 目录下）
import modelUrl from '/asset/DiffuseTransmissionTeacup.glb';

const container = ref(null);
let scene, camera, renderer, controls, animationId;

onMounted(() => {
  // 1. 初始化场景与相机
  scene = new THREE.Scene();
  const { clientWidth, clientHeight } = container.value;
  camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  // 2. 初始化渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(clientWidth, clientHeight);
  container.value.appendChild(renderer.domElement);

  // 3. 添加光源（GLB 模型通常需要充足的光照才能展现材质）
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // 4. 添加鼠标轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // 开启阻尼，让旋转更丝滑

  // 5. 加载 GLB 模型
  const loader = new GLTFLoader();
  loader.load(
    modelUrl, 
    (gltf) => {
      scene.add(gltf.scene);
      // 💡 提示：如果模型太小或太大，可以在这里调整 gltf.scene.scale
    },
    undefined,
    (error) => console.error('模型加载失败:', error)
  );

  // 6. 渲染循环
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
});

// ⚠️ 7. 组件卸载时清理资源，防止内存泄漏
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  controls.dispose();
  renderer.dispose();
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
});
</script>