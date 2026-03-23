import { execFile } from "node:child_process";
import path from "path";
import { promisify } from "node:util";
import react from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const execFileAsync = promisify(execFile);

const sitemapGeneratorPlugin = (mode: string): PluginOption => ({
  name: "generate-sitemap-on-build",
  apply: "build",
  async buildStart() {
    const env = loadEnv(mode, process.cwd(), "");

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/generate-sitemap.mjs"], {
        env: {
          ...process.env,
          ...env,
        },
      });

      if (stdout.trim()) {
        console.log(stdout.trim());
      }

      if (stderr.trim()) {
        console.error(stderr.trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sitemap generation failed.";
      this.error(message);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemapGeneratorPlugin(mode),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon-192.png", "pwa-icon-512.png"],
      manifest: {
        name: "Tekstil A.Ş.",
        short_name: "TekstilAŞ",
        description: "Tekstil ve hazır giyim için dijital B2B platform.",
        theme_color: "#0a1628",
        background_color: "#0a1628",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "tr",
        icons: [
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dropdown-menu",
          ],
          "vendor-icons": ["lucide-react"],
          "vendor-recharts": ["recharts"],
        },
      },
    },
  },
}));
