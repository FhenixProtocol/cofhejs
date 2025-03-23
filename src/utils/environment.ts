import { Environment } from "../types";

/**
 * Applies environment-specific default values to initialization parameters
 */
export function applyEnvironmentDefaults<T extends {
    environment?: Environment;
    coFheUrl?: string;
    verifierUrl?: string;
    thresholdNetworkUrl?: string;
}>(params: T): T {
    // Create a copy of the original params to avoid modifying the input
    const result = { ...params };

    if (!params.environment) {
        // If no environment is provided, all URLs must be explicitly provided
        if (!params.coFheUrl || !params.verifierUrl || !params.thresholdNetworkUrl) {
            throw new Error("When environment is not specified, coFheUrl, verifierUrl, and thresholdNetworkUrl must be provided");
        }
        return result;
    }

    switch (params.environment) {
        case "LOCAL":
            result.coFheUrl = params.coFheUrl || "http://127.0.0.1:8448";
            result.verifierUrl = params.verifierUrl || "http://127.0.0.1:3001";
            result.thresholdNetworkUrl = params.thresholdNetworkUrl || "http://127.0.0.1:3000";
            break;
        case "TESTNET":
            result.coFheUrl = params.coFheUrl || "https://cofhe.fhenix.zone";
            result.verifierUrl = params.verifierUrl || "https://cofhe-verifier.fhenix.zone";
            result.thresholdNetworkUrl = params.thresholdNetworkUrl || "https://cofhe-tn.fhenix.zone";
            break;
        case "MAINNET":
            result.coFheUrl = params.coFheUrl || "https://cofhe.fhenix.com";
            result.verifierUrl = params.verifierUrl || "https://cofhe-verifier.fhenix.com";
            result.thresholdNetworkUrl = params.thresholdNetworkUrl || "https://cofhe-tn.fhenix.com";
            break;
        default:
            throw new Error(`Unknown environment: ${params.environment}`);
    }

    return result;
} 