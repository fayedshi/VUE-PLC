import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import os from 'os'

function getLocalIP() {
  console.log('in getlocalip')
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部回环地址 (127.0.0.1) 和 IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

const getDynamicTarget = () => {
  const localIP = getLocalIP()
  console.log('当前本机 IP: ', localIP)

  if (localIP.startsWith('192.168.0.')) {
    return localIP
  }
  return '127.0.0.1'        // 默认连本地后端
}

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  assetsInclude: ['**/*.glb'], // 明确包含 GLB 文件

  server: {
    proxy: {
      '^.*/http-api': {
        target: 'http://' + getDynamicTarget() + ':8000', // 你的后端真实 IP
        changeOrigin: true,                // 允许跨域
        rewrite: (path) => path.replace(/^.*\/http-api/, '') // 把路径中的 /api 去掉再发给后端
        // rewrite: (path) => path.replace(/http-api/, '') // 把路径中的 /api 去掉再发给后端
      },

      '^.*/ws-api': {
        // 1号PLC
        // target: 'ws://192.168.0.180:8000', // 你的后端真实 IP
        target: 'ws://' + getDynamicTarget() + ':8000', // 你的后端真实 IP
        changeOrigin: true,                // 允许跨域
        ws: true,
        rewrite: (path) => path.replace(/^.*\/ws-api/, ''), // 把路径中的 /ws-api 去掉再发给后端
      },




    }

  }

})
