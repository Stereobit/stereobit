import { resolve } from "node:path"
import { defineConfig } from "vite"
import { compression } from "vite-plugin-compression2"
import browserslist from "browserslist"
import { browserslistToTargets } from "lightningcss"

const src = resolve(import.meta.dirname, "src")

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
    transformer: "lightningcss",
    lightningcss: {
      targets: browserslistToTargets(browserslist()),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, "build"),
    emptyOutDir: true,
    cssMinify: "lightningcss",
    rolldownOptions: {
      input: {
        index: resolve(src, "index.html"),
        404: resolve(src, "404.html"),
      },
    },
  },
  plugins: [
    compression({
      algorithms: ["gzip", "brotliCompress"],
      include: /\.(js|css|html|svg)$/,
      threshold: 0,
      skipIfLargerOrEqual: true,
    }),
  ],
})
