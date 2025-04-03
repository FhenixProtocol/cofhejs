export enum CofhejsErrorCodes {
  InternalError = "INTERNAL_ERROR",
  InvalidInput = "INVALID_INPUT",
  InvalidOutput = "INVALID_OUTPUT",
  InvalidState = "INVALID_STATE",
  InvalidOperation = "INVALID_OPERATION",
}

export type CofhejsError = {
  code: CofhejsErrorCodes;
  message: string;
  cause?: Error;
};

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
  return typeof error === "object" && error !== null && "code" in error;
};

export const ResultErrOrInternal = <T>(error: unknown): Result<T> => {
  if (isCofhejsError(error)) {
    return ResultErr(error);
  }
  return ResultErr({
    code: CofhejsErrorCodes.InternalError,
    message: "An internal error occurred",
    cause: error instanceof Error ? error : undefined,
  });
};

export const wrapResult = <T>(fn: () => T): Result<T> => {
  try {
    const result = fn();
    return ResultOk(result);
  } catch (error) {
    return ResultErrOrInternal<T>(error);
  }
};

export const wrapResultAsync = async <T>(
  fn: () => Promise<T>,
): Promise<Result<T>> => {
  try {
    const result = await fn();
    return ResultOk(result);
  } catch (error) {
    return ResultErrOrInternal<T>(error);
  }
};
