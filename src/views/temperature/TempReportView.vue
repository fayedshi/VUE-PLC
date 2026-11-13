<template>
  <div class="report-container">
    <!-- 1. 顶部查询工具栏 -->
    <div class="search-bar">
      <div class="bar-left">
        <HouseSelect v-model="selectedHouseCode" />
        <div class="search-item">
          <label>选择时间：</label>
          <input type="datetime-local" v-model="searchQuery.dateTime" class="input-date" />
        </div>
        <button class="btn-search" :disabled="isLoading" @click="handleSearch">
          {{ isLoading ? '查询中...' : '🔍 查询' }}
        </button>
        <button class="btn-reset" :disabled="isLoading" @click="resetSearch">
          🔄 恢复最新数据
        </button>
        <span class="detect-time">检测时间：<strong>{{ localTime || '--' }}</strong></span>
      </div>
    </div>

    <!-- 2. 主内容区：纯 2.5D 仓库立体视图 -->
    <div class="main-content">
      <div v-if="isLoading" class="loading-overlay">
        <p>正在读取 PLC 温度数据，请稍候...</p>
      </div>

      <!-- Three.js 2.5D 画布容器 -->
      <div ref="canvasContainer" class="canvas-container"></div>

      <!-- 左侧悬浮统计卡片 -->
      <div class="hud-panel left-panel" v-if="hasData">
        <h3>🌡️ 全仓温度极值统计</h3>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="layer-name">表层温度</span>
            <div class="stat-vals">
              <span class="max">高: {{ formatTemp(stats.surface.max / 10) }}</span>
              <span class="min">低: {{ formatTemp(stats.surface.min / 10) }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="layer-name">中上层温度</span>
            <div class="stat-vals">
              <span class="max">高: {{ formatTemp(stats.midUpper.max / 10) }}</span>
              <span class="min">低: {{ formatTemp(stats.midUpper.min / 10) }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="layer-name">中下层温度</span>
            <div class="stat-vals">
              <span class="max">高: {{ formatTemp(stats.midLower.max / 10) }}</span>
              <span class="min">低: {{ formatTemp(stats.midLower.min / 10) }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="layer-name">底层温度</span>
            <div class="stat-vals">
              <span class="max">高: {{ formatTemp(stats.bottom.max / 10) }}</span>
              <span class="min">低: {{ formatTemp(stats.bottom.min / 10) }}</span>
            </div>
          </div>
        </div>

        <div class="legend-box">
          <div class="legend-item"><span class="dot high"></span> 高温预警 (>35℃)</div>
          <div class="legend-item"><span class="dot normal"></span> 正常温度 (5~35℃)</div>
          <div class="legend-item"><span class="dot low"></span> 低温警示 5℃</div>
          <p class="tip-text">💡 操作提示：左键拖拽平移，滚轮缩放查看各层温度卡片。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import HouseSelect from '../../components/HouseSelect.vue'

// ==================== 业务状态 ====================
const isLoading = ref(false)
const localTime = ref('')
const selectedHouseCode = ref('001')
const searchQuery = ref({ dateTime: '' })
const hasData = ref(false)

const createInitialStats = () => ({
  surface: { min: 1000, max: -50 },
  midUpper: { min: 1000, max: -50 },
  midLower: { min: 1000, max: -50 },
  bottom: { min: 1000, max: -50 }
})
const stats = ref(createInitialStats())

// ==================== 纯原生 Three.js 变量 ====================
const canvasContainer = ref(null)
let scene = null
let camera = null
let renderer = null
let controls = null
let animationId = null
let cableGroup = null

// 电缆立柱共享几何体与材质
const sharedRodGeo = new THREE.CylinderGeometry(0.14, 0.14, 13.5, 8)
const sharedRodMat = new THREE.MeshBasicMaterial({ color: 0x475569 })

// 绘制圆角矩形辅助函数
const drawRoundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 生成电缆顶部编号小牌
const createIdCardSprite = (text) => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 48
  const ctx = canvas.getContext('2d')

  drawRoundRect(ctx, 4, 4, 120, 40, 8)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#64748b'
  ctx.stroke()

  ctx.font = 'bold 24px sans-serif'
  ctx.fillStyle = '#f8fafc'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 25)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.4, 0.9, 1)
  return sprite
}

// 生成测温点小卡片（直接替代原来的小球）
const createTempCardSprite = (tempVal, isHigh, isLow) => {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 54
  const ctx = canvas.getContext('2d')

  // 根据温度状态设置卡片背景色、边框色与文字色
  let bgColor = 'rgba(15, 23, 42, 0.9)'
  let borderColor = '#10b981'
  let textColor = '#34d300'

  if (isHigh) {
    bgColor = 'rgba(185, 28, 28, 0.95)' // 高温红底
    borderColor = '#fca5a5'
    textColor = '#ffffff'
  } else if (isLow) {
    bgColor = 'rgba(3, 105, 161, 0.95)' // 低温蓝底
    borderColor = '#7dd3fc'
    textColor = '#ffffff'
  }

  drawRoundRect(ctx, 4, 4, 152, 46, 10)
  ctx.fillStyle = bgColor
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = borderColor
  ctx.stroke()

  ctx.font = 'bold 26px sans-serif'
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${tempVal.toFixed(1)}℃`, 80, 28)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  // 高温卡片稍微放大一点更醒目
  const scaleFactor = isHigh ? 1.15 : 1.0
  sprite.scale.set(3.2 * scaleFactor, 1.08 * scaleFactor, 1)
  return sprite
}

// ==================== 1. 初始化 2.5D 场景 ====================
const init25DScene = () => {
  const container = canvasContainer.value
  if (!container) return

  const width = container.clientWidth || window.innerWidth
  const height = container.clientHeight || window.innerHeight - 60

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1120)

  const aspect = width / height
  const frustumSize = 62
  camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  )
  camera.position.set(58, 52, 58)
  camera.lookAt(0, 6, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enableRotate = true
  controls.screenSpacePanning = true
  controls.minZoom = 0.5
  controls.maxZoom = 2.5

  // 仓库地板与外框线
  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(76, 0.6, 56),
    new THREE.MeshBasicMaterial({ color: 0x162033 })
  )
  floorMesh.position.y = -0.3
  scene.add(floorMesh)

  const gridHelper = new THREE.GridHelper(74, 18, 0x1e3a8a, 0x1e293b)
  gridHelper.position.y = 0.02
  scene.add(gridHelper)

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(76, 15, 56))
  const wireFrame = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 })
  )
  wireFrame.position.y = 7.5
  scene.add(wireFrame)

  cableGroup = new THREE.Group()
  scene.add(cableGroup)

  window.addEventListener('resize', onWindowResize)

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
}

// ==================== 2. 绘制 35 根电缆 + 140 张温度小卡片 ====================
const renderCablesIn25D = (cache) => {
  if (!scene || !cableGroup) return

  // 安全清理旧卡片贴图内存
  for (let i = cableGroup.children.length - 1; i >= 0; i--) {
    const obj = cableGroup.children[i]
    if (obj && obj.isSprite && obj.material) {
      if (obj.material.map) obj.material.map.dispose()
      obj.material.dispose()
    }
  }
  cableGroup.clear()

  if (!cache || Object.keys(cache).length === 0) {
    hasData.value = false
    return
  }

  hasData.value = true
  const cols = 7
  const rows = 5
  const spacingX = 10.0
  const spacingZ = 10.0
  const startX = -((cols - 1) * spacingX) / 2
  const startZ = -((rows - 1) * spacingZ) / 2

  // 4 个测温层高度（适当拉开垂直距离，让小卡片上下不遮挡）
  const layerHeights = [12.0, 8.8, 5.6, 2.4]

  for (let cableIdx = 0; cableIdx < 35; cableIdx++) {
    const col = cableIdx % cols
    const row = Math.floor(cableIdx / cols)
    const posX = startX + col * spacingX
    const posZ = startZ + row * spacingZ

    // 1. 垂直电缆立柱
    const rodMesh = new THREE.Mesh(sharedRodGeo, sharedRodMat)
    rodMesh.position.set(posX, 6.75, posZ)
    cableGroup.add(rodMesh)

    // 2. 顶部电缆编号卡片
    const idCard = createIdCardSprite(`#${cableIdx + 1}`)
    idCard.position.set(posX, 14.2, posZ)
    cableGroup.add(idCard)

    // 3. 直接在 4 个测温点位置挂载温度小卡片
    for (let layer = 0; layer < 4; layer++) {
      const rawVal = cache[`temp${cableIdx * 4 + layer}`]
      if (rawVal === undefined || isNaN(rawVal)) continue

      const tempVal = Number(rawVal) / 10
      const isHigh = tempVal > 35.0
      const isLow = tempVal < 5.0

      const tempCard = createTempCardSprite(tempVal, isHigh, isLow)
      tempCard.position.set(posX, layerHeights[layer], posZ)
      cableGroup.add(tempCard)
    }
  }
}

const onWindowResize = () => {
  if (!canvasContainer.value || !renderer || !camera) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  if (width === 0 || height === 0) return
  const aspect = width / height
  const frustumSize = 62
  camera.left = (frustumSize * aspect) / -2
  camera.right = (frustumSize * aspect) / 2
  camera.top = frustumSize / 2
  camera.bottom = frustumSize / -2
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
// ==================== 数据请求与极值统计 ====================
const fetchTemperatureData = async (formattedTime = '') => {
  isLoading.value = true
  try {
    const response = await axios.get('http-api/api/tempreport', {
      params: {
        input_time: formattedTime,
        house_code: selectedHouseCode.value
      }
    })
    const data = response.data || {}
    if (data['time']) {
      localTime.value = (new Date(data['time'].replace(/\.\d+/, '') + 'Z')).toLocaleString()
      console.log('date time,', data['time'], 'local time', localTime.value)
    }
    const currentStats = createInitialStats()
    for (let i = 0; i < 140; i++) {
      const tempCell = data[`temp${i}`]
      if (tempCell === undefined || isNaN(tempCell)) continue
      const mod = i % 4
      if (mod === 0) {
        currentStats.surface.min = Math.min(currentStats.surface.min, tempCell)
        currentStats.surface.max = Math.max(currentStats.surface.max, tempCell)
      } else if (mod === 1) {
        currentStats.midUpper.min = Math.min(currentStats.midUpper.min, tempCell)
        currentStats.midUpper.max = Math.max(currentStats.midUpper.max, tempCell)
      } else if (mod === 2) {
        currentStats.midLower.min = Math.min(currentStats.midLower.min, tempCell)
        currentStats.midLower.max = Math.max(currentStats.midLower.max, tempCell)
      } else if (mod === 3) {
        currentStats.bottom.min = Math.min(currentStats.bottom.min, tempCell)
        currentStats.bottom.max = Math.max(currentStats.bottom.max, tempCell)
      }
    }
    stats.value = currentStats
    renderCablesIn25D(data)
  } catch (err) {
    console.error('获取数据异常:', err)
  } finally {
    isLoading.value = false
  }
}
watch(selectedHouseCode, () => {
  fetchTemperatureData(searchQuery.value.dateTime)
})
const handleSearch = () => {
  if (!searchQuery.value.dateTime) {
    alert('请先选择要查询的日期和具体时间！')
    return
  }
  fetchTemperatureData(searchQuery.value.dateTime)
}
const resetSearch = () => {
  searchQuery.value.dateTime = ''
  fetchTemperatureData()
}
const formatTemp = (val) => {
  return val !== undefined && val !== null && !isNaN(val) ? `${Number(val).toFixed(1)} ℃` : '--'
}
onMounted(() => {
  init25DScene()
  fetchTemperatureData()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onWindowResize)
  if (renderer) renderer.dispose()
})
</script>

<style scoped>
.report-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0b1120;
  color: #e2e8f0;
  overflow: hidden;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  z-index: 10;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.input-date {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #475569;
  background: #0f172a;
  color: #fff;
}

button {
  padding: 6px 14px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-search {
  background: #3b82f6;
  color: #fff;
}

.btn-reset {
  background: #475569;
  color: #fff;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-content {
  position: relative;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(11, 17, 32, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.hud-panel.left-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 160px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  z-index: 20;
}

.hud-panel h3 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #38bdf8;
}

.stat-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card {
  background: rgba(30, 41, 59, 0.7);
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stat-vals {
  display: flex;
  flex-direction: column;
  text-align: right;
  font-size: 12px;
}

.stat-vals.max {
  color: #f87171;
}

.stat-vals.min {
  color: #38bdf8;
}

.legend-box {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot.high {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
}

.dot.normal {
  background: #10b981;
}

.dot.low {
  background: #38bdf8;
}

.tip-text {
  margin-top: 10px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}
</style>