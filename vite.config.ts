// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import type { IncomingMessage, ServerResponse } from 'http';
import type { Connect } from 'vite';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Get server port from environment or use default
const serverPort = process.env.PORT || '3001';
const clientPort = process.env.CLIENT_PORT || '4002';

// Export both default and named configuration
export const viteConfig = defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  console.log(`[VITE] Running in ${mode} mode`);
  console.log(`[VITE] Environment variables:`, {
    POSTHOG_KEY: env.VITE_POSTHOG_KEY || 'undefined',
    POSTHOG_HOST: env.VITE_POSTHOG_HOST || 'undefined'
  });

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        // Add nonce to inline scripts
        babel: {
          plugins: [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
          ]
        }
      }),
      // Temporarily disable runtime error overlay to fix useEffect error
      // runtimeErrorOverlay(),
      themePlugin()
    ],
    resolve: {
      alias: {
        "@db": path.resolve(__dirname, "db"),
        "@": path.resolve(__dirname, "client", "src"),
      },
    },
    optimizeDeps: {
      include: ['posthog-js'],
      esbuildOptions: {
        target: 'es2020',
        platform: 'browser',
        supported: {
          'top-level-await': true
        }
      },
    },
    // Ensure environment variables are properly loaded
    define: {
      'import.meta.env.VITE_POSTHOG_KEY': JSON.stringify(env.VITE_POSTHOG_KEY || ''),
      'import.meta.env.VITE_POSTHOG_HOST': JSON.stringify(env.VITE_POSTHOG_HOST || '')
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      sourcemap: true,
      minify: 'esbuild',
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            posthog: ['posthog-js'],
            vendor: [
              'react',
              'react-dom'
            ],
          },
          format: 'es',
        },
        external: [
          /^node:.*/,
        ],
        onwarn(warning, warn) {
          // Ignore specific warnings about date-fns module resolution
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.source && warning.source.includes('date-fns')) {
            return;
          }
          warn(warning);
        }
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 4002,
        clientPort: 4002,
        timeout: 120000
      },
      host: true,
      port: parseInt(clientPort, 10),
      strictPort: true,
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Upgrade', 'Connection']
      },
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' *;
          style-src 'self' 'unsafe-inline' *;
          style-src-elem 'self' 'unsafe-inline' *;
          font-src 'self' data: *;
          img-src 'self' data: blob: *;
          connect-src 'self' ws: wss: http: https: localhost:* *;
          frame-src 'self' *;
          worker-src 'self' blob: *;
        `.replace(/\s+/g, ' ').trim()
      },
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.PORT || 3001}`,
          changeOrigin: true,
          secure: false,
          ws: true,
          xfwd: true,
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: '/',
          withCredentials: true
        }
      },
      fs: {
        strict: false
      },
      watch: {
        usePolling: true
      }
    },
  };
});

// Default export for Vite
export default viteConfig;