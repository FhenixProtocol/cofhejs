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
  private sender?: string;
  private chainId?: string;
  private securityZone?: number;
  private stepCallback?: EncryptSetStateFn;
  private inputItems?: [...T];
  private zkVerifierUrl?: string;
  private zk?: ZkPackProveVerify<any, any>;

  constructor(params: {
    inputs: [...T];
    sender?: string;
    chainId?: string;
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

  private getResolvedSender() {
    if (this.sender) return this.sender;

    throw new CofhejsError({
      code: CofhejsErrorCode.AccountUninitialized,
      message: "No sender provided and no account initialized",
    });
  }

  private getResolvedChainId() {
    if (this.chainId) return this.chainId;

    throw new CofhejsError({
      code: CofhejsErrorCode.ChainIdUninitialized,
      message: "No chainId provided and no chainId initialized",
    });
  }

  private getResolvedInputItems() {
    if (this.inputItems) return this.inputItems;

    throw new CofhejsError({
      code: CofhejsErrorCode.InvalidPermitData,
      message:
        "No inputs provided. Call .inputs() with at least one EncryptableItem.",
    });
  }

  private getResolvedZk() {
    if (this.zk) return this.zk;
    throw new CofhejsError({
      code: CofhejsErrorCode.ZkUninitialized,
      message: "No zk provided and no zk initialized",
    });
  }

  private getResolvedZkVerifierUrl() {
    if (this.zkVerifierUrl) return this.zkVerifierUrl;
    throw new CofhejsError({
      code: CofhejsErrorCode.ZkVerifierUrlUninitialized,
      message: "No zkVerifierUrl provided and no zkVerifierUrl initialized",
    });
  }

  private getExtractedEncryptableItems() {
    const inputItems = this.getResolvedInputItems();
    return encryptExtract(inputItems);
  }

  private replaceEncryptableItems(inItems: CoFheInItem[]) {
    const inputItems = this.getResolvedInputItems();
    const [prepared, remaining] = encryptReplace(inputItems, inItems);
    if (remaining.length === 0) return prepared;

    throw new CofhejsError({
      code: CofhejsErrorCode.EncryptRemainingInItems,
      message: "Some encrypted inputs remaining after replacement",
    });
  }

  async encrypt(): Promise<[...Encrypted_Inputs<T>]> {
    const sender = this.getResolvedSender();
    const chainId = this.getResolvedChainId();
    const securityZone = this.getResolvedSecurityZone();
    const zkVerifierUrl = this.getResolvedZkVerifierUrl();
    const zk = this.getResolvedZk();

    this.fireCallback(EncryptStep.Extract);

    const encryptableItems = this.getExtractedEncryptableItems();

    this.fireCallback(EncryptStep.Pack);

    const builder = zk.pack(encryptableItems);

    this.fireCallback(EncryptStep.Prove);

    const proved = await zk.prove(builder, sender, securityZone, chainId);

    this.fireCallback(EncryptStep.Verify);

    const verifyResults = await zk.verify(
      zkVerifierUrl,
      proved,
      sender,
      securityZone,
      chainId,
    );

    // Add securityZone and utype to the verify results
    const inItems: CoFheInItem[] = verifyResults.map(
      ({ ct_hash, signature }, index) => ({
        ctHash: BigInt(ct_hash),
        securityZone: securityZone,
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
