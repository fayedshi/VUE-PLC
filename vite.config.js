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

      '^.*/ws-api': {
        target: 'ws://192.168.0.16:8000', // 你的后端真实 IP
        changeOrigin: true,                // 允许跨域
        ws: true,
        rewrite: (path) => path.replace(/^.*\/ws-api/, ''), // 把路径中的 /ws-api 去掉再发给后端

        configure: (proxy, options) => {
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            // console.log('【WS代理成功拦截】原路径:', req.url,' 实际发送后端请求',proxyReq.path);

          });
          proxy.on('error', (err, req, res) => {
            console.error('【代理报错】', err);
          });
        }
      }
    }

  }

})
