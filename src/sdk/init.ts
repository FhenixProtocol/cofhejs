import init_browser, { init_panic_hook as init_panic_hook_browser } from "tfhe";
import { init_panic_hook as init_panic_hook_node } from "node-tfhe";

let initialized: boolean;

export const initTfhe: (target: "browser" | "node") => Promise<void> = async (
  target,
) => {
  try {
    if (initialized) return;
    if (target === "browser") {
      await init_browser();
      await init_panic_hook_browser();
    }
    if (target === "node") {
      await init_panic_hook_node();
    }
    initialized = true;
  } catch (err) {
    throw new Error(`Error initializing TFHE ${err}`);
  }
};
