import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolves `import Image from "next/image"` in the cloned
      // capacitor-app-optimization source files to our shim so the
      // cloned code compiles in Vite unchanged. See
      // src/components/whering/NextImageShim.tsx for the contract.
      "next/image": path.resolve(
        __dirname,
        "./src/components/whering/NextImageShim.tsx"
      ),
    },
  },
  define: {
    // Polyfill `process.env.NODE_ENV` for any third-party module that
    // slipped into the bundle (e.g. a stranded chunk from
    // `node_modules/next/dist/client/image-component.js` if Vite's
    // pre-bundler raced ahead of the resolve.alias for `next/image`).
    // Vite replaces `process.env.NODE_ENV` with a string literal at
    // build/dev time, so the browser never sees `ReferenceError:
    // process is not defined` even if a stale chunk surfaces.
    'process.env.NODE_ENV': JSON.stringify(mode),
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
    // CRITICAL: Exclude these from pre-bundling —
    //   - `@huggingface/transformers`: large WASM bundle that breaks on
    //     iOS if eager-bundled.
    //   - `next/image`: Vite's pre-bundler resolves the module path
    //     BEFORE `resolve.alias` runs, so even with the correct alias
    //     the optimizer creates a stranded `next_image` chunk that
    //     references `process.env`. Excluding it forces the alias to
    //     be the sole resolver.
    exclude: ['@huggingface/transformers', 'next/image']
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
}))