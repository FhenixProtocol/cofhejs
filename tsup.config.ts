import { defineConfig } from "tsup";
import fs from "fs";
import path from "path";

export default defineConfig({
  entry: {
    web: "./src/web/index.ts",
    node: "./src/node/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  external: ["tfhe", "node-tfhe"],
  esbuildOptions(options) {
    options.assetNames = "assets/[name]";
    options.loader = {
      ...options.loader,
      ".wasm": "file",
    };
  },
  async onSuccess() {
    console.log("@@@ SUCCESS @@@");
    const destDir = path.resolve("dist");
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Create legacy compatibility files (main entry point defaults to web)
    const webFiles = ["web.js", "web.mjs", "web.d.ts"];
    webFiles.forEach((file) => {
      const src = path.join(destDir, file);
      const dest = path.join(destDir, file.replace("web", "index"));
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
  },
  outDir: "dist",
  treeshake: true,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".js" : ".mjs",
    };
  },
  legacyOutput: false,
  noExternal: [],
});
