// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Keep leaflet/react-leaflet in their own chunk. Otherwise they get merged into a
          // shared vendor chunk that every SSR route imports statically, and leaflet touches
          // `window` at module scope → "window is not defined" 500s during SSR.
          manualChunks(id: string) {
            if (/node_modules[/\\](leaflet|react-leaflet|@react-leaflet)[/\\]/.test(id)) {
              return "leaflet-vendor";
            }
          },
        },
      },
    },
  },
});

