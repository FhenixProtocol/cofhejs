import { init_panic_hook } from "node-tfhe";

export async function initTfhe() {
  await init_panic_hook();
}
