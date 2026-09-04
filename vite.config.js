import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
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
        target: 'http://192.168.0.16:8000', // 你的后端真实 IP
        changeOrigin: true,                // 允许跨域
        rewrite: (path) => path.replace(/^.*\/http-api/, '') // 把路径中的 /api 去掉再发给后端
        // rewrite: (path) => path.replace(/http-api/, '') // 把路径中的 /api 去掉再发给后端
      },

      // '^.*/ws-api': {
      //   // 1号PLC
      //   target: 'ws://192.168.0.16:8000', // 你的后端真实 IP
      //   changeOrigin: true,                // 允许跨域
      //   ws: true,
      //   rewrite: (path) => path.replace(/^.*\/ws-api/, ''), // 把路径中的 /ws-api 去掉再发给后端
      // },

      // 1号PLC
      '^.*/ws-001-api': {
        target: 'ws://192.168.0.16:8000', // 你的后端真实 IP
        changeOrigin: true,                // 允许跨域
        ws: true,
        rewrite: (path) => path.replace(/^.*\/ws-001-api/, ''), // 把路径中的 /ws-api 去掉再发给后端

        configure: (proxy, options) => {
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            // console.log('【WS代理成功拦截】原路径:', req.url,' 实际发送后端请求',proxyReq.path);

          });
          proxy.on('error', (err, req, res) => {
            console.error('【代理报错】', err);
          });
        }
      },

      // 2号PLC
      '^.*/ws-002-api': {
        target: 'ws://192.168.0.100:8000', // 你的后端真实 IP，目前连test环境做测试
        // target: 'ws://192.168.0.16:8001', // 8001表示第二个进程
        changeOrigin: true,                // 允许跨域
        ws: true,
        rewrite: (path) => path.replace(/^.*\/ws-002-api/, ''), // 把路径中的 /ws-api 去掉再发给后端
      }
    }

  }

})
