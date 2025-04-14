import { EncryptSetStateFn, EncryptStep } from "../../types";

export function marshallEncryptParams(
  setStateOrSecurityZone?: EncryptSetStateFn | number,
  maybeSetState?: EncryptSetStateFn,
): { securityZone: number; setStateCallback: EncryptSetStateFn } {
  let securityZone = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let setStateCallback = (_state: EncryptStep) => {};

  if (typeof setStateOrSecurityZone === "number") {
    securityZone = setStateOrSecurityZone;
    setStateCallback = maybeSetState ?? setStateCallback;
  } else if (typeof setStateOrSecurityZone === "function") {
    setStateCallback = setStateOrSecurityZone;
  }

  return { securityZone, setStateCallback };
}
