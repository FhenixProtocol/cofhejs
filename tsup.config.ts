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
    const tfheDir = path.resolve("node_modules/tfhe");
    const destDir = path.resolve("dist");
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy the tfhe.js file
    fs.copyFileSync(
      path.join(tfheDir, "tfhe.js"),
      path.join(destDir, "tfhe.js")
    );


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
