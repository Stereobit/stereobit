import { resolve } from "node:path"
import { defineConfig } from "vite"
import { compression } from "vite-plugin-compression2"
import autoprefixer from "autoprefixer"

const src = resolve(import.meta.dirname, "src")

// Inject the JS entry into every page, so the HTML templates stay free of build wiring.
const injectEntry = () => ({
  name: "inject-entry",
  transformIndexHtml: {
    order: "pre",
    handler: () => [
      {
        tag: "script",
        attrs: { type: "module", src: "/index.js" },
        injectTo: "body",
      },
    ],
  },
})

export default defineConfig({
  root: src,
  publicDir: "rootfiles",
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, "build"),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      input: {
        index: resolve(src, "index.html"),
        404: resolve(src, "404.html"),
      },
    },
  },
  plugins: [
    injectEntry(),
    compression({
      algorithms: ["gzip"],
      include: /\.(js|css|html)$/,
      threshold: 0,
      skipIfLargerOrEqual: true,
    }),
  ],
})
