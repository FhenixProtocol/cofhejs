/// <reference types="vitest" />

import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { setup, teardown } from "./test/test-setup";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  test: {
    watch: false,
    include: [
      "test/**/*.test.ts",
      "test/**/*.test.js",
      "src/**/*.test.ts",
      "src/**/*.test.js",
    ],
    watchExclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: ["./test/test-setup.ts"],
    reporters: [
      "basic",
      "verbose",
      {
        async onWatcherRerun() {
          await teardown();
          await setup();
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"],
    },
  },
});
