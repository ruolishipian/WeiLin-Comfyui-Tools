/// <reference types="vite/client" />

// 扩展 ImportMetaEnv 接口以添加自定义环境变量
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  // 更多环境变量可以在这里添加
  // 例如: readonly VITE_APP_TITLE: string
}

// 确保 ImportMeta 包含 env 属性
interface ImportMeta {
  readonly env: ImportMetaEnv
}
