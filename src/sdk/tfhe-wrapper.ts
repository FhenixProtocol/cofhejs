type TfheBrowser = typeof import("tfhe");
let tfheModule: TfheBrowser | typeof import("node-tfhe");

export async function initTfhe(target: "web" | "node") {
  if (!tfheModule) {
    const module = target === "node" ? "node-tfhe" : "tfhe";
    tfheModule = await import(module);
  }

  // Browser requires init
  if (target === "web") {
    await (tfheModule as TfheBrowser).default();
  }

  // Both targets require panic hook init
  tfheModule.init_panic_hook();

  return tfheModule as TfheBrowser;
}

export function getTfhe() {
  if (tfheModule == null) throw new Error("Tfhe not initialized");
  return tfheModule as TfheBrowser;
}
