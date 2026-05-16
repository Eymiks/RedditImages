/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REDDIT_CLIENT_ID: string;
  readonly VITE_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
