<template>
  <div class="report-container">
    <h2>综合温度报表</h2>

    <!-- 1. 时间查询工具栏 -->
    <div class="search-bar">
      <div class="search-item">
        <label>选择日期时间：</label>
        <input type="datetime-local" v-model="searchQuery.dateTime" class="input-date" />
      </div>
      <button class="btn-search" @click="handleSearch">🔍 查询</button>
      <button class="btn-reset" @click="resetSearch">🔄 重置当前</button>
    </div>

    <!-- 2. 数据报表表格区域 -->
    <div class="table-wrapper">
      <table class="grain-temp-table">
        <thead>
          <tr>
            <!-- 循环生成 5 个电缆列大标题 -->
            <th v-for="i in 5" :key="i" colspan="5" class="cable-group-th">
              电缆单元 {{ i }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- 循环 7 行 (35根电缆 / 每行5根 = 7行) -->
          <tr v-for="(row, rowIndex) in chunkedCables" :key="rowIndex">
            
            <!-- 遍历当前行的 5 根电缆 -->
            <template v-for="(cable, cableIndex) in row" :key="cableIndex">
              <!-- 电缆层级标签列 -->
              <td class="layer-label-td">
                <div class="cable-title">电缆 {{ cable.cableId }}</div>
                <div class="layer-item">表层</div>
                <div class="layer-item">中上</div>
                <div class="layer-item">中下</div>
                <div class="layer-item">底层</div>
              </td>
              <!-- 电缆实际 4 个点位的温度数值列 -->
              <td class="temp-val-td">
                <div class="cable-title-placeholder">&nbsp;</div>
                <div class="temp-value" :class="getTempClass(cable.temps[0])">{{ formatTemp(cable.temps[0]) }}</div>
                <div class="temp-value" :class="getTempClass(cable.temps[1])">{{ formatTemp(cable.temps[1]) }}</div>
                <div class="temp-value" :class="getTempClass(cable.temps[2])">{{ formatTemp(cable.temps[2]) }}</div>
                <div class="temp-value" :class="getTempClass(cable.temps[3])">{{ formatTemp(cable.temps[3]) }}</div>
              </td>
              <!-- 间隔空列，美化排版（最后一根电缆后不加） -->
              <td v-if="cableIndex < 4" class="table-divider"></td>
            </template>

          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'


// 模拟从全局/接口获取的 140 个温度原始缓存数据 (global_plc_cache)
const global_plc_cache = ref([])

const http = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 5000
});

// 查询表单数据
const searchQuery = ref({
  dateTime: ''
})

// 模拟初始化 140 个温度数据 (通常从 Pinia 仓库或 API 获取)
const initMockData = () => {
  const mock = []
  // for (let i = 0; i < 140; i++) {
  //   // 随机生成 15.0℃ 到 28.0℃ 之间的温度
  //   mock.push(parseFloat((Math.random() * 13 + 15).toFixed(1)))
  // }
  global_plc_cache.value = mock
}

// 核心计算属性 1：将 140 个数据按 4 个一组，打包成 35 根电缆对象
const processedCables = computed(() => {
  const cables = []
  const cache = global_plc_cache.value

  for (let i = 0; i < cache.length; i += 4) {
    const cableId = Math.floor(i / 4) + 1 // 电缆号 1 ~ 35
    cables.push({
      cableId: cableId,
      // temps[0]=表层, temps[1]=中上, temps[2]=中下, temps[3]=底层
      temps: [cache[i], cache[i + 1], cache[i + 2], cache[i + 3]]
    })
  }
  return cables
})

// 核心计算属性 2：将 35 根电缆按 5 个一组，打包成 7 行数据以便表格渲染
const chunkedCables = computed(() => {
  const rows = []
  const cables = processedCables.value

  for (let i = 0; i < cables.length; i += 5) {
    rows.push(cables.slice(i, i + 5))
  }
  return rows
})


// 响应式数据
const loading = ref(false)

// 定义获取数据函数
const handleSearch = async () => {
  loading.value = true
  try {
    // 发送 GET 请求
    const response = await http.get('/api/tempbytime', {
      params: {
        input_time: searchQuery.value.dateTime
      }
    });
    console.log(response.data)
    global_plc_cache.value = response.data
  } catch (err) {
    console.error('获取数据异常:', err)
  } finally {
    loading.value = false
  }
}



// // 时间查询逻辑
// const handleSearch = () => {
//   if (!searchQuery.value.dateTime) {
//     alert('请选择查询的日期时间')
//     return
//   }
//   console.log('正在向后端查询该时间节点的数据：', searchQuery.value.dateTime)

//   // 此处编写您的 axios 请求，更新 global_plc_cache.value 即可
//   alert(`已成功加载 ${searchQuery.value.dateTime} 历史测温快照数据（模拟）`)
//   initMockData() // 刷新模拟数据
// }

// 重置查询
const resetSearch = () => {
  searchQuery.value.dateTime = ''
  initMockData()
}

// 温度格式化辅助
const formatTemp = (val) => {
  return val !== undefined ? `${val} ℃` : '--'
}

// 高温预警颜色判定（示例：超过25度显示橙色警告）
const getTempClass = (val) => {
  if (val > 25) return 'temp-warn'
  if (val < 18) return 'temp-cool'
  return 'temp-normal'
}

onMounted(() => {
  // initMockData()
})
</script>

<style scoped>
.page-container h2 { margin-bottom: 20px; color: #fff; }
.card { background: #141b26; border: 1px solid #222f43; border-radius: 8px; padding: 20px; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 12px; border-bottom: 1px solid #222f43; }
.data-table th { color: #a0aec0; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.normal { background: #005533; color: #00ff88; }
.tag.warn { background: #553300; color: #ffaa00; }
</style>
<style scoped>
.report-container {
  padding: 10px;
  color: #e2e8f0;
}
h2 { margin-bottom: 20px; color: #00ffcc; }

/* 查询栏样式 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #141b26;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #222f43;
  margin-bottom: 20px;
}
.search-item { display: flex; align-items: center; gap: 8px; }
.input-date {
  background: #0f141c;
  border: 1px solid #4a5568;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  outline: none;
}
.btn-search { background: #00ffcc; color: #0b0f17; font-weight: bold; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-reset { background: #222f43; color: #fff; border: 1px solid #4a5568; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-search:hover { background: #00ccaa; }
.btn-reset:hover { background: #2d3748; }

/* 工业级表格设计 */
.table-wrapper {
  background: #141b26;
  border: 1px solid #222f43;
  border-radius: 8px;
  padding: 15px;
  overflow-x: auto;
}
.grain-temp-table {
  width: 100%;
  border-collapse: collapse;
}

/* 表头 */
.cable-group-th {
  background: #1e293b;
  color: #00ffcc;
  padding: 10px;
  font-size: 14px;
  border: 1px solid #222f43;
  text-align: center;
}

/* 表体单元格逻辑 */
.layer-label-td {
  width: 100px;
  text-align: left;
  padding: 10px 5px 10px 10px;
  vertical-align: top;
  border-bottom: 1px solid #222f43;
}
.temp-val-td {
  width: 90px;
  text-align: right;
  padding: 10px 10px 10px 5px;
  vertical-align: top;
  border-bottom: 1px solid #222f43;
}

/* 局部文字排版 */
.cable-title { color: #38bdf8; font-weight: bold; font-size: 13px; margin-bottom: 5px;}
.cable-title-placeholder { font-size: 13px; margin-bottom: 5px; }
.layer-item { font-size: 12px; color: #a0aec0; height: 24px; line-height: 24px; }
.temp-value { font-size: 13px; height: 24px; line-height: 24px; font-weight: 500; }

/* 虚线列间隔符，用于肉眼区分5个不同的电缆 */
.table-divider {
  width: 15px;
  border-bottom: 1px solid #222f43;
  border-right: 1px dashed #2d3748;
}

/* 温度阈值颜色判定 */
.temp-normal { color: #00ff88; } /* 正常绿色 */
.temp-warn { color: #ffaa00; font-weight: bold; } /* 偏高橙色 */
.temp-cool { color: #38bdf8; } /* 偏低蓝色 */
</style>