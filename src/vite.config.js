import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** @type {import('vite').UserConfig} */
// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url))
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  build: {
    minify: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'main.js'),
      name: 'weilin-prompt-ui',
      formats: ['umd']
    },
    rollupOptions: {
      plugins: [],
      output: {
        globals: {},
        name: 'WeiLinPromptUI',
        dir: '../dist/', // 明确输出到项目根目录的dist
        format: 'umd',
        chunkFileNames: 'javascript/[name].chunk.js',
        entryFileNames: 'javascript/[name].entry.js',
        assetFileNames: (assetInfo) => {
          // 固定CSS文件名为style.css，确保前端能正确加载
          if (assetInfo.name.endsWith('.css')) {
            return 'style.css'
          }
          return '[name].[ext]'
        }
      }
    },
    // 复制 Service Worker 文件到输出目录
    copyPublicDir: false
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['vue', 'vue-i18n', 'pako'],
    exclude: []
  }
})
