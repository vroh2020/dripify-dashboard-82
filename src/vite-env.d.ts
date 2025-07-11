/// <reference types="vite/client" />
/// <reference path="./types/capacitor-apple-sign-in.d.ts" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  // add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
