let tfheModule: typeof import("tfhe") | typeof import("node-tfhe");

export async function initTfhe(target: "web" | "node") {
  if (!tfheModule) {
    tfheModule = await (target === "node"
      ? import("node-tfhe")
      : import("tfhe"));
  }

  // Browser requires init
  if (target === "web") {
    await (tfheModule as typeof import("tfhe")).default();
  }

  // Both targets require panic hook init
  tfheModule.init_panic_hook();

  return tfheModule;
}

export function getTfhe() {
  if (tfheModule == null) throw new Error("Tfhe not initialized");
  return tfheModule;
}
