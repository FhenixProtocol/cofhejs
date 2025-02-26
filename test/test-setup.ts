import { waitForZkVerifierToStart } from "./utils";
import {
  killZkVerifierContainer,
  runCoFheContainers,
  runZkVerifierContainer,
  stopCoFheContainers,
} from "./docker";

const TEST_ZK_VERIFIER_URL =
  process.env.TEST_ZK_VERIFIER_URL ?? "http://localhost:3000";

export const setup = async () => {
  if (process.env.SKIP_LOCAL_ENV === "true") {
    return;
  }

  // await Promise.all([runZkVerifierContainer(), runCoFheContainers()]);
  await runZkVerifierContainer();

  console.log("\nWaiting for zk verifier / CoFHE to start...");

  await Promise.all([
    waitForZkVerifierToStart(TEST_ZK_VERIFIER_URL),
    // waitForCoFheContainersToStart(),
  ]);

  console.log("zk verifier & CoFHE running!");
};

// this is a cjs because jest sucks at typescript

export const teardown = async () => {
  if (process.env.SKIP_LOCAL_ENV === "true") {
    return;
  }
  console.log("\nWaiting for containers to stop...");

  await Promise.all([killZkVerifierContainer(), stopCoFheContainers(true)]);

  console.log("Stopped test container. Goodbye!");
};
