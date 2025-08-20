/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EncryptStep,
  EncryptSetStateFn,
  CoFheInItem,
  Encrypted_Inputs,
} from "../../types";
import { encryptExtract, encryptReplace } from "../sdk/index";
import { CofhejsError, CofhejsErrorCode } from "../../types";
import { ZkPackProveVerify } from "./zkPackProveVerify";

export class EncryptInputsBuilder<T extends any[]> {
  private sender: string;
  private chainId: string;
  private securityZone?: number;
  private stepCallback?: EncryptSetStateFn;
  private inputItems: [...T];
  private zkVerifierUrl: string;
  private zk: ZkPackProveVerify<any, any>;

  constructor(params: {
    inputs: [...T];
    sender: string;
    chainId: string;
    zkVerifierUrl: string;
    zk: ZkPackProveVerify<any, any>;
  }) {
    this.inputItems = params.inputs;
    this.sender = params.sender;
    this.chainId = params.chainId;
    this.zkVerifierUrl = params.zkVerifierUrl;
    this.zk = params.zk;
  }

  /**
   * @param sender - The overridden msg.sender of the transaction that will consume the encrypted inputs.
   *
   * If not provided, the account initialized in `cofhejs.initialize` will be used.
   * Used when msg.sender is known to be different from the account initialized in `cofhejs.initialize`,
   * for example when using a paymaster.
   *
   * Example:
   * ```typescript
   * const encrypted = await encryptInputs([Encryptable.uint128(10n)])
   *   .setSender("0x123")
   *   .encrypt();
   * ```
   *
   * @returns The EncryptInputsBuilder instance.
   */
  setSender(sender: string): EncryptInputsBuilder<T> {
    this.sender = sender;
    return this;
  }

  setSecurityZone(securityZone: number): EncryptInputsBuilder<T> {
    this.securityZone = securityZone;
    return this;
  }

  /**
   * @param callback - A function that will be called with the current step of the encryption process.
   *
   * Useful for debugging and tracking the progress of the encryption process.
   * Useful for a UI element that shows the progress of the encryption process.
   *
   * Example:
   * ```typescript
   * const encrypted = await encryptInputs([Encryptable.uint128(10n)])
   *   .setStepCallback((step: EncryptStep) => console.log(step))
   *   .encrypt();
   * ```
   *
   * @returns The EncryptInputsBuilder instance.
   */
  setStepCallback(callback: EncryptSetStateFn): EncryptInputsBuilder<T> {
    this.stepCallback = callback;
    return this;
  }

  private fireCallback(step: EncryptStep) {
    if (!this.stepCallback) return;
    this.stepCallback(step);
  }

  private getResolvedSecurityZone() {
    return this.securityZone ?? 0;
  }

  private getExtractedEncryptableItems() {
    return encryptExtract(this.inputItems);
  }

  private replaceEncryptableItems(inItems: CoFheInItem[]) {
    const [prepared, remaining] = encryptReplace(this.inputItems, inItems);
    if (remaining.length === 0) return prepared;

    throw new CofhejsError({
      code: CofhejsErrorCode.EncryptRemainingInItems,
      message: "Some encrypted inputs remaining after replacement",
    });
  }

  async encrypt(): Promise<[...Encrypted_Inputs<T>]> {
    const securityZone = this.getResolvedSecurityZone();

    this.fireCallback(EncryptStep.Extract);

    const encryptableItems = this.getExtractedEncryptableItems();

    this.fireCallback(EncryptStep.Pack);

    const builder = this.zk.pack(encryptableItems);

    this.fireCallback(EncryptStep.Prove);

    const proved = await this.zk.prove(
      builder,
      this.sender,
      securityZone,
      this.chainId,
    );

    this.fireCallback(EncryptStep.Verify);

    const verifyResults = await this.zk.verify(
      this.zkVerifierUrl,
      proved,
      this.sender,
      securityZone,
      this.chainId,
    );

    // Add securityZone and utype to the verify results
    const inItems: CoFheInItem[] = verifyResults.map(
      ({ ct_hash, signature }, index) => ({
        ctHash: BigInt(ct_hash),
        securityZone,
        utype: encryptableItems[index].utype,
        signature,
      }),
    );

    this.fireCallback(EncryptStep.Replace);

    const preparedInputItems = this.replaceEncryptableItems(inItems);

    this.fireCallback(EncryptStep.Done);

    return preparedInputItems;
  }
}
