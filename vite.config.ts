import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: true, // Expose to all IPs (crucial for Docker)
      port: 3000,
    },
    define: {
      // Polyfill process.env for the app to read API_KEY
      'process.env': env
    }
  };
});