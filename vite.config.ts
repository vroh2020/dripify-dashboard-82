import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Deny access to files outside of the project root
      strict: true,
      // Allow access to specific directories
      allow: [
        // Allow access to the project root
        path.resolve(__dirname),
        // Allow access to node_modules
        path.resolve(__dirname, 'node_modules'),
      ],
      // Deny access to sensitive files and directories
      deny: [
        // Deny access to .git directory
        '**/.git/**',
        // Deny access to .env files
        '**/.env*',
        // Deny access to package-lock.json
        '**/package-lock.json',
        // Deny access to any files outside the project root
        '**/../**',
      ],
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
