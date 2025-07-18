import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Default configuration for deployment
const defaultSupabaseUrl = 'https://jjqwhxamjxsiotnhhqco.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXdoeGFtanhzaW90bmhocWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMDQxNTQsImV4cCI6MjA1MzY4MDE1NH0.4KMTPF3R6-XQCeRVPSuuWibRawzjEtk60RFCQZr2dz0';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Define environment variables with defaults for all environments
  define: {
    // Provide default Supabase configuration with actual values
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || defaultSupabaseUrl
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey
    ),
    'import.meta.env.VITE_REVENUECAT_PUBLIC_KEY': JSON.stringify(
      process.env.VITE_REVENUECAT_PUBLIC_KEY || ''
    ),
  },
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
