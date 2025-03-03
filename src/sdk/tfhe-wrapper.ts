type TfheBrowser = typeof import("tfhe");
let tfheModule: TfheBrowser | typeof import("node-tfhe");

export async function initTfhe(target: "web" | "node") {
  if (!tfheModule) {
    const module = target === "node" ? "node-tfhe" : "tfhe";

    if (typeof require !== "undefined") {
      // Use require in CJS (Node)
      tfheModule = require(module);
    } else {
      // Use dynamic import in ESM
      tfheModule = await import(module).then((m) => m);
    }
  }

  if (target === "web") {
    await (tfheModule as TfheBrowser).default();
  }

  tfheModule.init_panic_hook();
  return tfheModule as TfheBrowser;
}

export function getTfhe() {
  if (tfheModule == null) throw new Error("Tfhe not initialized");
  return tfheModule as TfheBrowser;
}
