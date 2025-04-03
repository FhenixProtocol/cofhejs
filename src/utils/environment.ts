import { Environment, Result, ResultErr, ResultOk } from "../types";

/**
 * Applies environment-specific default values to initialization parameters
 */
export function applyEnvironmentDefaults<
  T extends {
    environment?: Environment;
    coFheUrl?: string;
    verifierUrl?: string;
    thresholdNetworkUrl?: string;
  },
>(params: T): Result<T> {
  // Create a copy of the original params to avoid modifying the input
  const result = { ...params };

  if (!params.environment) {
    // If no environment is provided, all URLs must be explicitly provided
    if (
      !params.coFheUrl ||
      !params.verifierUrl ||
      !params.thresholdNetworkUrl
    ) {
      throw new Error(
        "When environment is not specified, coFheUrl, verifierUrl, and thresholdNetworkUrl must be provided",
      );
    }
    return ResultOk(result);
  }

  switch (params.environment) {
    case "MOCK":
      result.coFheUrl = undefined;
      result.verifierUrl = undefined;
      result.thresholdNetworkUrl = undefined;
      break;
    case "LOCAL":
      result.coFheUrl = params.coFheUrl || "http://127.0.0.1:8448";
      result.verifierUrl = params.verifierUrl || "http://127.0.0.1:3001";
      result.thresholdNetworkUrl =
        params.thresholdNetworkUrl || "http://127.0.0.1:3000";
      break;
    case "TESTNET":
      result.coFheUrl =
        params.coFheUrl ||
        "http://cofhe.fhenix.zone:8448";
      result.verifierUrl =
        params.verifierUrl || "http://cofhe-vrf.fhenix.zone:3001";
      result.thresholdNetworkUrl =
        params.thresholdNetworkUrl ||
        "http://cofhe-tn.fhenix.zone:3000";
      break;
    case "MAINNET":
      result.coFheUrl =
        params.coFheUrl ||
        "http://cofhe-sepolia-cofhe-full-lb-52f737bc5a860f4a.elb.eu-west-1.amazonaws.com";
      result.verifierUrl =
        params.verifierUrl || "http://fullstack.tn-testnets.fhenix.zone:3001";
      result.thresholdNetworkUrl =
        params.thresholdNetworkUrl ||
        "http://fullstack.tn-testnets.fhenix.zone:3000";
      break;
    default:
      return ResultErr(`Unknown environment: ${params.environment}`);
  }

  return ResultOk(result);
}
