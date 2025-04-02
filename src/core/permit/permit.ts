/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, id, keccak256, ZeroAddress } from "ethers";
import {
  getSignatureTypesAndMessage,
  PermitSignaturePrimaryType,
  SignatureTypes,
} from "./generate";
import { FullyFormedPermitValidator, PermitParamsValidator } from "./permit.z";
import {
  Permission,
  PermitInterface,
  PermitMetadata,
  PermitOptions,
  SerializedPermit,
  AbstractSigner,
  EIP712Domain,
  AbstractProvider,
} from "../../types";
import {
  EthEncryptedData,
  GenerateSealingKey,
  SealingKey,
} from "../sdk/sealing";
import {
  fnEip712DomainIface,
  TaskManagerAddress,
  fnAclIface,
} from "../utils/consts";

export class Permit implements PermitInterface, PermitMetadata {
  /**
   * Name for this permit, for organization and UI usage, not included in signature.
   */
  public name: string;
  /**
   * The type of the Permit (self / sharing)
   * (self) Permit that will be signed and used by the issuer
   * (sharing) Permit that is signed by the issuer, but intended to be shared with recipient
   * (recipient) Permit that has been received, and signed by the recipient
   */
  public type: "self" | "sharing" | "recipient";
  /**
   * (base) User that initially created the permission, target of data fetching
   */
  public issuer: string;
  /**
   * (base) Expiration timestamp
   */
  public expiration: number;
  /**
   * (sharing) The user that this permission will be shared with
   * ** optional, use `address(0)` to disable **
   */
  public recipient: string;
  /**
   * (issuer defined validation) An id used to query a contract to check this permissions validity
   * ** optional, use `0` to disable **
   */
  public validatorId: number;
  /**
   * (issuer defined validation) The contract to query to determine permission validity
   * ** optional, user `address(0)` to disable **
   */
  public validatorContract: string;
  /**
   * (base) The publicKey of a sealingPair used to re-encrypt `issuer`s confidential data
   *   (non-sharing) Populated by `issuer`
   *   (sharing)     Populated by `recipient`
   */
  public sealingPair: SealingKey;
  /**
   * (base) `signTypedData` signature created by `issuer`.
   * (base) Shared- and Self- permissions differ in signature format: (`sealingKey` absent in shared signature)
   *   (non-sharing) < issuer, expiration, recipient, validatorId, validatorContract, sealingKey >
   *   (sharing)     < issuer, expiration, recipient, validatorId, validatorContract >
   */
  public issuerSignature: string;
  /**
   * (sharing) `signTypedData` signature created by `recipient` with format:
   * (sharing) < sealingKey, issuerSignature>
   * ** required for shared permits **
   */
  public recipientSignature: string;

  /**
   * EIP712 domain used to sign this permit.
   * Should not be set manually, included in metadata as part of serialization flows.
   */
  public _signedDomain: EIP712Domain | undefined = undefined;

  public constructor(
    options: PermitInterface,
    metadata?: Partial<PermitMetadata>,
  ) {
    this.name = options.name;
    this.type = options.type;
    this.issuer = options.issuer;
    this.expiration = options.expiration;
    this.recipient = options.recipient;
    this.validatorId = options.validatorId;
    this.validatorContract = options.validatorContract;
    this.sealingPair = options.sealingPair;
    this.issuerSignature = options.issuerSignature;
    this.recipientSignature = options.recipientSignature;

    this._signedDomain = metadata?._signedDomain;
  }

  static async create(options: PermitOptions) {
    const {
      success,
      data: parsed,
      error,
    } = PermitParamsValidator.safeParse(options);

    if (!success) {
      throw new Error(
        "Permit :: create :: Parsing PermitOptions failed " +
          JSON.stringify(error, null, 2),
      );
    }

    const sealingPair =
      parsed.sealingPair != null
        ? new SealingKey(
            parsed.sealingPair.privateKey,
            parsed.sealingPair.publicKey,
          )
        : await GenerateSealingKey();

    return new Permit({
      ...parsed,
      sealingPair,
    });
  }

  static async createAndSign(
    options: PermitOptions,
    signer: AbstractSigner | undefined,
  ) {
    const permit = await Permit.create(options);
    await permit.sign(signer);
    return permit;
  }

  updateName = (name: string) => {
    this.name = name;
  };

  /**
   * Creates a `Permit` from a serialized permit, hydrating methods and classes
   * NOTE: Does not return a stringified permit
   *
   * @param {SerializedPermit} - Permit structure excluding classes
   * @returns {Permit} - New instance of Permit class
   */
  static deserialize = ({
    _signedDomain,
    sealingPair,
    ...permit
  }: SerializedPermit) => {
    return new Permit(
      {
        ...permit,
        sealingPair: new SealingKey(
          sealingPair.privateKey,
          sealingPair.publicKey,
        ),
      },
      {
        _signedDomain,
      },
    );
  };

  static validate = (permit: Permit) => {
    return FullyFormedPermitValidator.safeParse(permit);
  };

  /**
   * Utility to extract the public data from a permit.
   * Used in `serialize`, `getPermission`, `getHash` etc
   */
  getInterface = (): PermitInterface => {
    return {
      name: this.name,
      type: this.type,
      issuer: this.issuer,
      expiration: this.expiration,
      recipient: this.recipient,
      validatorId: this.validatorId,
      validatorContract: this.validatorContract,
      sealingPair: this.sealingPair,
      issuerSignature: this.issuerSignature,
      recipientSignature: this.recipientSignature,
    };
  };

  /**
   * Export the necessary permit data to share a permit with another user
   */
  export = () => {
    const cleanedPermit: Record<string, unknown> = {
      name: this.name,
      type: this.type,
      issuer: this.issuer,
      expiration: this.expiration,
    };

    if (this.recipient !== ZeroAddress)
      cleanedPermit.recipient = this.recipient;
    if (this.validatorId !== 0) cleanedPermit.validatorId = this.validatorId;
    if (this.validatorContract !== ZeroAddress)
      cleanedPermit.validatorContract = this.validatorContract;
    if (this.type === "sharing" && this.issuerSignature !== "0x")
      cleanedPermit.issuerSignature = this.issuerSignature;

    return JSON.stringify(cleanedPermit, undefined, 2);
  };

  /**
   * Returns a serializable permit instance, removing classes and methods.
   * NOTE: Does not return a stringified permit
   */
  serialize = (): SerializedPermit => {
    const { sealingPair, ...permit } = this.getInterface();
    return {
      ...permit,
      _signedDomain: this._signedDomain,
      sealingPair: {
        publicKey: sealingPair.publicKey,
        privateKey: sealingPair.privateKey,
      },
    };
  };

  /**
   * Extracts a contract input ready permission from this permit.
   * The permission inherits most fields from the permit, however
   * `permit.sealingPair` is removed and replaced by `permit.sealingPair.publicKey` in the `sealingKey` field.
   *
   * @permit {boolean} skipValidation - Flag to prevent running validation on the permit before returning the extracted permission. Used internally.
   * @returns {Permission}
   */
  getPermission = (skipValidation = false): Permission => {
    const permitData = this.getInterface();

    if (!skipValidation) {
      const validationResult = FullyFormedPermitValidator.safeParse(permitData);

      if (!validationResult.success) {
        throw new Error(
          `Permit :: getPermission :: permit validation failed - ${JSON.stringify(
            validationResult.error,
            null,
            2,
          )} ${JSON.stringify(permitData, null, 2)}`,
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, type, sealingPair, ...permit } = permitData;
    return {
      ...permit,
      sealingKey: `0x${sealingPair.publicKey}`,
    };
  };

  /**
   * Returns a stable hash depending on the core data of the permit.
   * Is used in the store as each permit's key in the permit map.
   */
  getHash = () =>
    keccak256(
      id(
        JSON.stringify({
          type: this.type,
          issuer: this.issuer,
          expiration: this.expiration,
          recipient: this.recipient,
          validatorId: this.validatorId,
          validatorContract: this.validatorContract,
        }),
      ),
    );

  /**
   * Returns the domain, types, primaryType, and message fields required to request the user's signature
   * Primary type is returned to allow viem clients to more easily connect
   */
  getSignatureParams = (primaryType: PermitSignaturePrimaryType) => {
    return getSignatureTypesAndMessage(
      primaryType,
      SignatureTypes[primaryType],
      this.getPermission(true),
    );
  };

  /**
   * Fetches the EIP712 domain for the given chainId.
   * If the domain is not found, it will be fetched from the EIP712 domain registry.
   *
   * @param {string} chainId - The chainId to fetch the EIP712 domain for
   * @param {AbstractProvider} provider - The provider to fetch the EIP712 domain from
   * @returns {EIP712Domain} - The EIP712 domain for the given chainId
   */
  fetchEIP712Domain = async (
    provider: AbstractProvider,
  ): Promise<EIP712Domain> => {
    const taskManagerInterface = new ethers.Interface(fnAclIface);
    const aclCallData = taskManagerInterface.encodeFunctionData("acl");
    const aclAddressResult = await provider.call({
      to: TaskManagerAddress,
      data: aclCallData,
    });
    const [aclAddress] = taskManagerInterface.decodeFunctionResult(
      "acl",
      aclAddressResult,
    );

    const domainIface = new ethers.Interface(fnEip712DomainIface);
    const domainCalldata = domainIface.encodeFunctionData("eip712Domain");

    const domainResult = await provider.call({
      to: aclAddress,
      data: domainCalldata,
    });

    const [
      _fields,
      name,
      version,
      chainId,
      verifyingContract,
      _salt,
      _extensions,
    ] = domainIface.decodeFunctionResult("eip712Domain", domainResult);

    return {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract,
    };
  };

  /**
   * Returns true if the permit's signed domain matches the provided domain.
   */
  matchesDomain = (domain: EIP712Domain) => {
    return (
      this._signedDomain?.name === domain.name &&
      this._signedDomain?.version === domain.version &&
      this._signedDomain?.verifyingContract === domain.verifyingContract &&
      this._signedDomain?.chainId === domain.chainId
    );
  };

  /**
   * Fetches the EIP712 domain for the connected chain (`provider`)
   * Returns false if the domain doesn't match, or if the permit has no signed domain
   *
   * @param {AbstractProvider} provider - The provider to fetch the EIP712 domain from
   * @returns {boolean} - True if the domain matches, false otherwise
   */
  checkSignedDomainValid = async (provider: AbstractProvider) => {
    if (this._signedDomain == null) return false;
    const domain = await this.fetchEIP712Domain(provider);
    return this.matchesDomain(domain);
  };

  /**
   * Determines the required signature type.
   * Creates the EIP712 types and message.
   * Prompts the user for their signature.
   * Inserts the signature into `issuerSignature` or `recipientSignature` as necessary.
   *
   * @param {AbstractSigner} signer - Signer responsible for signing the EIP712 permit signature, throws if undefined
   */
  sign = async (signer: AbstractSigner | undefined) => {
    if (signer == null)
      throw new Error(
        "Permit :: sign - signer undefined, you must pass in a `signer` for the connected user to create a permit signature",
      );

    let primaryType: PermitSignaturePrimaryType = "PermissionedV2IssuerSelf";
    if (this.type === "self") primaryType = "PermissionedV2IssuerSelf";
    if (this.type === "sharing") primaryType = "PermissionedV2IssuerShared";
    if (this.type === "recipient") primaryType = "PermissionedV2Recipient";

    const domain = await this.fetchEIP712Domain(signer.provider);
    const { types, message } = this.getSignatureParams(primaryType);

    const signature = await signer.signTypedData(
      { ...domain, chainId: domain.chainId },
      types,
      message,
    );

    if (this.type === "self" || this.type === "sharing") {
      this.issuerSignature = signature;
    }
    if (this.type === "recipient") {
      this.recipientSignature = signature;
    }

    this._signedDomain = domain;
  };

  /**
   * Use the privateKey of `permit.sealingPair` to unseal `ciphertext` returned from the Fhenix chain.
   * Useful when not using `SealedItem` structs and need to unseal an individual ciphertext.
   */
  unseal = (ciphertext: EthEncryptedData): bigint => {
    return this.sealingPair.unseal(ciphertext);
  };

  // TODO: Re-enable once unseal narrowed to only unseal EthEncryptedData2
  // /**
  //  * Uses the privateKey of `permit.sealingPair` to recursively unseal any contained `SealedItems`.
  //  * If `item` is a single `SealedItem` it will be individually.
  //  * NOTE: Only unseals typed `SealedItem`s returned from `FHE.sealoutputTyped` and the FHE bindings' `e____.sealTyped`.
  //  *
  //  * @param {any | any[]} item - Array, object, or item. Any nested `SealedItems` will be unsealed.
  //  * @returns - Recursively unsealed data in the target type, SealedBool -> boolean, SealedAddress -> string, etc.
  //  */
  // unseal<T>(item: T): MappedUnsealedTypes<T>;
  // unseal<T extends any[]>(item: [...T]): [...MappedUnsealedTypes<T>];
  // unseal<T>(item: T) {
  //   // SealedItem
  //   const sealedItem = getAsSealedItem(item);
  //   if (sealedItem != null) {
  //     const bn = chainIsHardhat(this._signedDomain?.chainId)
  //       ? hardhatMockUnseal(sealedItem.data)
  //       : this.sealingPair.unseal(sealedItem.data);

  //     if (isSealedBool(sealedItem)) {
  //       // Return a boolean for SealedBool
  //       return Boolean(bn).valueOf() as any;
  //     }
  //     if (isSealedAddress(sealedItem)) {
  //       // Return a string for SealedAddress
  //       return getAddress(`0x${bn.toString(16).slice(-40)}`) as any;
  //     }
  //     if (isSealedUint(sealedItem)) {
  //       // Return a bigint for SealedUint
  //       return bn as any;
  //     }
  //   }

  //   // Object | Array
  //   if (typeof item === "object" && item !== null) {
  //     if (Array.isArray(item)) {
  //       // Array - recurse
  //       return item.map((nestedItem) => this.unseal(nestedItem));
  //     } else {
  //       // Object - recurse
  //       const result: any = {};
  //       for (const key in item) {
  //         result[key] = this.unseal(item[key]);
  //       }
  //       return result;
  //     }
  //   }

  //   // Primitive
  //   return item;
  // }

  /**
   * Returns whether the active party has created their signature.
   * If `permit.type` is self or sharing, the active party is `issuer`.
   * If `permit.type` is recipient, the active party is `recipient`
   *
   * @returns {boolean}
   */
  isSigned = () => {
    if (this.type === "self" || this.type === "sharing") {
      return this.issuerSignature !== "0x";
    }
    if (this.type === "recipient") {
      return this.recipientSignature != "0x";
    }
    return false;
  };

  /**
   * Returns whether this permit has expired due to `permit.expiration`
   *
   * @returns {boolean}
   */
  isExpired = () => {
    return this.expiration < Math.floor(Date.now() / 1000);
  };

  /**
   * Overall validity checker of a permit, checks the signatures and expirations
   *
   * @returns {{valid: boolean, error: string}} - If `valid`, `error` is null, else `error` indicates which validity check failed
   */
  isValid = () => {
    if (this.isExpired()) return { valid: false, error: "expired" } as const;
    if (!this.isSigned()) return { valid: false, error: "not-signed" } as const;
    return { valid: true, error: null } as const;
  };
}
