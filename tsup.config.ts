import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    web: "./src/web/index.ts",
    node: "./src/node/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["tfhe", "node-tfhe"],
  esbuildOptions(options) {
    options.assetNames = "assets/[name]";
    options.loader = {
      ...options.loader,
      ".wasm": "file",
    };
  },
  outDir: "dist",
});
