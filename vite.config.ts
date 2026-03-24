import { execFile } from "node:child_process";
import path from "path";
import { promisify } from "node:util";
import react from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { defineConfig, loadEnv, type PluginOption } from "vite";


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
