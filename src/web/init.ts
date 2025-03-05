import init, { initThreadPool, init_panic_hook } from "tfhe";

export async function initTfhe() {
  await init();
  await initThreadPool(navigator.hardwareConcurrency);
  await init_panic_hook();
}
