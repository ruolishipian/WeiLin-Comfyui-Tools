/**
 * 复制 Service Worker 文件到输出目录
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const swSource = resolve(__dirname, 'sw.js')
const swTargetDist = resolve(__dirname, '../dist/sw.js')
const swTargetJsNode = resolve(__dirname, '../js_node/sw.js')

try {
  // 确保输出目录存在
  const distDir = dirname(swTargetDist)
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
  }

  const jsNodeDir = dirname(swTargetJsNode)
  if (!existsSync(jsNodeDir)) {
    mkdirSync(jsNodeDir, { recursive: true })
  }

  // 复制 Service Worker 文件到 dist 目录
  copyFileSync(swSource, swTargetDist)
  console.log('✓ Service Worker 文件已复制到 dist 目录')

  // 复制 Service Worker 文件到 js_node 目录 (ComfyUI 扩展目录)
  copyFileSync(swSource, swTargetJsNode)
  console.log('✓ Service Worker 文件已复制到 js_node 目录')
} catch (error) {
  console.error('✗ 复制 Service Worker 文件失败:', error.message)
  process.exit(1)
}
