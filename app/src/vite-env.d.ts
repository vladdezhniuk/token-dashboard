/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TOKEN_ADDRESS?: string
  readonly VITE_CHAIN_ID?: string
  readonly VITE_REOWN_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
