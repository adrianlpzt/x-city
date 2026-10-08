/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (por defecto) o "x". */
  readonly VITE_TWEET_SOURCE?: string;
  /** URL base del backend para el proveedor real. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
