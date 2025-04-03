/* eslint-disable @typescript-eslint/no-explicit-any */
export enum CofhejsErrorCode {
  InternalError = "INTERNAL_ERROR",
  UnknownEnvironment = "UNKNOWN_ENVIRONMENT",
  InitTfheFailed = "INIT_TFHE_FAILED",
  InitViemFailed = "INIT_VIEM_FAILED",
  InitEthersFailed = "INIT_ETHERS_FAILED",
  NotInitialized = "NOT_INITIALIZED",
  MissingProviderParam = "MISSING_PROVIDER_PARAM",
  MissingSecurityZonesParam = "MISSING_SECURITY_ZONES_PARAM",
  InvalidPermitData = "INVALID_PERMIT_DATA",
  InvalidPermitDomain = "INVALID_PERMIT_DOMAIN",
  PermitNotFound = "PERMIT_NOT_FOUND",
  AccountUninitialized = "ACCOUNT_UNINITIALIZED",
  ChainIdUninitialized = "CHAIN_ID_UNINITIALIZED",
  FheKeyNotFound = "FHE_KEY_NOT_FOUND",
  CrsNotFound = "CRS_NOT_FOUND",
  ProviderNotInitialized = "PROVIDER_NOT_INITIALIZED",
  SignerNotInitialized = "SIGNER_NOT_INITIALIZED",
  SealOutputFailed = "SEAL_OUTPUT_FAILED",
  SealOutputReturnedNull = "SEAL_OUTPUT_RETURNED_NULL",
  InvalidUtype = "INVALID_UTYPE",
  DecryptFailed = "DECRYPT_FAILED",
  DecryptReturnedNull = "DECRYPT_RETURNED_NULL",
  ZkVerifyInsertPackedCtHashesFailed = "ZK_VERIFY_INSERT_PACKED_CT_HASHES_FAILED",
  ZkVerifySignFailed = "ZK_VERIFY_SIGN_FAILED",
  ZkVerifyFailed = "ZK_VERIFY_FAILED",
  EncryptRemainingInItems = "ENCRYPT_REMAINING_IN_ITEMS",
}

export class CofhejsError extends Error {
  public readonly code: CofhejsErrorCode;
  public readonly cause?: Error;

  constructor({
    code,
    message,
    cause,
  }: {
    code: CofhejsErrorCode;
    message: string;
    cause?: Error;
  }) {
    super(message);
    this.name = "CofhejsError";
    this.code = code;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CofhejsError);
    }
  }

  serialize(): string {
    return JSON.stringify({
      code: this.code,
      message: this.message,
      cause: this.cause,
    });
  }
}

export type Result<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: CofhejsError };

export const ResultErr = <T>(error: CofhejsError): Result<T> => ({
  success: false,
  data: null,
  error,
});

export const ResultOk = <T>(data: T): Result<T> => ({
  success: true,
  data,
  error: null,
});

export const isCofhejsError = (error: unknown): error is CofhejsError => {
  if (error instanceof CofhejsError) return true;
  return false;
};

export const ResultErrOrInternal = <T>(error: unknown): Result<T> => {
  if (isCofhejsError(error)) {
    return ResultErr(error);
  }
  return ResultErr(
    new CofhejsError({
      code: CofhejsErrorCode.InternalError,
      message: "An internal error occurred",
      cause: error instanceof Error ? error : undefined,
    }),
  );
};

export function wrapFunction<Args extends any[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => Result<R> {
  return (...args: Args) => {
    try {
      return ResultOk(fn(...args));
    } catch (err) {
      return ResultErrOrInternal(err);
    }
  };
}

export function wrapFunctionAsync<Args extends any[], R>(
  fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<Result<R>> {
  return async (...args: Args) => {
    try {
      const result = await fn(...args);
      return ResultOk(result);
    } catch (error) {
      return ResultErrOrInternal(error);
    }
  };
}

export const ResultHttpError = (
  error: unknown,
  url: string,
  status?: number,
): CofhejsError => {
  if (error instanceof CofhejsError) return error;

  const message = status
    ? `HTTP error ${status} from ${url}`
    : `HTTP request failed for ${url}`;

  return new CofhejsError({
    code: CofhejsErrorCode.InternalError,
    message,
    cause: error instanceof Error ? error : undefined,
  });
};

export const ResultValidationError = (message: string): CofhejsError => {
  return new CofhejsError({
    code: CofhejsErrorCode.InvalidPermitData,
    message,
  });
};
