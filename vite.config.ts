import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'esbuild',
    // CRITICAL: Don't inline WASM files - iOS needs them separate
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Keep transformers.js in separate chunk for iOS
        manualChunks: {
          'transformers': ['@huggingface/transformers']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
      '@supabase/supabase-js',
    ],
    // CRITICAL: Exclude transformers - causes WASM issues on iOS if optimized
    exclude: ['@huggingface/transformers']
  },
  server: {
    port: 3000,
    host: true,
    // Enable WASM support in dev server
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
})