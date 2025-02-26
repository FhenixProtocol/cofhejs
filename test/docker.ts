/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
import util from "util";
import { writeFile, unlink } from "fs/promises";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const execPromise = util.promisify(require("child_process").exec);

// ZK Verifier (Image)

export const ZK_VERIFIER_CONTAINER_NAME = "cofhejs-test-zk-verifier";

// Function to run a Docker container using the 'execPromise' function
export async function runZkVerifierContainer() {
  const image = "ghcr.io/fhenixprotocol/zk-verifier:alpha-no-fheos";
  const ports = "-p 3000:3000";

  const remove = `docker kill ${ZK_VERIFIER_CONTAINER_NAME}`;

  const command = `docker run --rm --name ${ZK_VERIFIER_CONTAINER_NAME} ${ports} -d ${image}`;

  try {
    try {
      await execPromise(remove);
    } catch (_) {}
    const result = await execPromise(command);
    console.log(result.stdout);
    console.error(result.stderr);
  } catch (error: any) {
    console.error(error.message);
    throw new Error("Failed to start docker container");
  }
}

export async function killZkVerifierContainer() {
  const removePrevious = `docker kill ${ZK_VERIFIER_CONTAINER_NAME}`;

  try {
    await execPromise(removePrevious);
  } catch (error: any) {
    console.error(error.message);
    throw new Error("Failed to remove docker container");
  }
}

// COFHE (Docker Compose)

const COFHE_DOCKER_COMPOSE_FILE =
  "https://raw.githubusercontent.com/FhenixProtocol/cofhe/refs/heads/master/docker-compose.yml";
const TEMP_FILE_PATH = "cofhe-compose.yml";

/**
 * Fetches a remote file and saves it locally.
 * @param url - The URL of the remote file.
 * @param filePath - The local path to save the file.
 */
async function fetchDockerCompose(
  url: string,
  filePath: string,
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const fileContent = await response.text();
  await writeFile(filePath, fileContent, "utf8");
}

/**
 * Cleanup function to remove the temp docker-compose file.
 */
async function cleanup() {
  try {
    await unlink(TEMP_FILE_PATH);
    console.log("Temporary docker-compose file removed.");
  } catch (error) {
    console.warn("Cleanup failed:", error);
  }
}

/**
 * Starts Docker Compose after ensuring the docker-compose.yml file exists.
 */
export async function runCoFheContainers() {
  try {
    // Download the docker-compose.yml file
    await fetchDockerCompose(COFHE_DOCKER_COMPOSE_FILE, TEMP_FILE_PATH);
    console.log("CoFHE docker-compose file saved. Starting containers...");

    try {
      await stopCoFheContainers();
      console.log("Existing CoFHE containers stopped.");
    } catch (_) {}

    // Run docker-compose up
    const process = await execPromise(
      `docker-compose -f ${TEMP_FILE_PATH} up -d`,
    );

    console.log(process.stdout);
    console.error(process.stderr);

    // Cleanup
    // await cleanup();
  } catch (error) {
    console.error("Error fetching or starting docker-compose:", error);
  }
}

/**
 * Stops and removes all containers from docker-compose.
 */
export async function stopCoFheContainers(requiresFetch = false) {
  try {
    console.log("Stopping CoFHE containers...");

    if (requiresFetch) {
      await fetchDockerCompose(COFHE_DOCKER_COMPOSE_FILE, TEMP_FILE_PATH);
      console.log("CoFHE docker-compose file saved. Stopping containers...");
    }

    // Run docker-compose down
    const { stdout, stderr } = await execPromise(
      `docker-compose -f ${TEMP_FILE_PATH} down`,
    );

    console.log(stdout);
    if (stderr) console.error(stderr);

    // Cleanup
    // await cleanup();
  } catch (error: any) {
    console.error("Error stopping docker-compose:", error.message);
  }
}
