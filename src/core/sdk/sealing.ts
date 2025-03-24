import {
  fromHexString,
  toBeArray,
  toBigInt,
  toHexString,
  isBigIntOrNumber,
  isString,
} from "../utils";
import * as nacl from "tweetnacl";

const PRIVATE_KEY_LENGTH = 64;
const PUBLIC_KEY_LENGTH = 64;

export type EthEncryptedData = {
  data: Uint8Array;
  public_key: Uint8Array;
  nonce: Uint8Array;
};

/**
 * A class representing a SealingKey which provides cryptographic sealing (encryption)
 * and unsealing (decryption) capabilities.
 */
export class SealingKey {
  /**
   * The private key used for decryption.
   */
  privateKey: string;
  /**
   * The public key used for encryption.
   */
  publicKey: string;

  /**
   * Constructs a SealingKey instance with the given private and public keys.
   *
   * @param {string} privateKey - The private key used for decryption.
   * @param {string} publicKey - The public key used for encryption.
   * @throws Will throw an error if the provided keys lengths do not match
   *         the required lengths for private and public keys.
   */
  constructor(privateKey: string, publicKey: string) {
    if (privateKey.length !== PRIVATE_KEY_LENGTH) {
      throw new Error(`Private key must be of length ${PRIVATE_KEY_LENGTH}`);
    }

    if (publicKey.length !== PUBLIC_KEY_LENGTH) {
      throw new Error(`Private key must be of length ${PUBLIC_KEY_LENGTH}`);
    }

    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  unseal = (parsedData: EthEncryptedData): bigint => {
    // Ensure all parameters are Uint8Array
    const nonce =
      parsedData.nonce instanceof Uint8Array
        ? parsedData.nonce
        : new Uint8Array(parsedData.nonce);

    const ephemPublicKey =
      parsedData.public_key instanceof Uint8Array
        ? parsedData.public_key
        : new Uint8Array(parsedData.public_key);

    const dataToDecrypt =
      parsedData.data instanceof Uint8Array
        ? parsedData.data
        : new Uint8Array(parsedData.data);

    // Make sure the private key is also a Uint8Array
    const privateKeyBytes = fromHexString(this.privateKey);

    // Debug information
    // console.log("nonce length:", nonce.length);
    // console.log("ephemPublicKey length:", ephemPublicKey.length);
    // console.log("privateKeyBytes length:", privateKeyBytes.length);
    // console.log("dataToDecrypt length:", dataToDecrypt.length);

    // call the nacl box function to decrypt the data
    const decryptedMessage = nacl.box.open(
      dataToDecrypt,
      nonce,
      ephemPublicKey,
      privateKeyBytes,
    );

    if (!decryptedMessage) {
      throw new Error("Failed to decrypt message");
    }

    return toBigInt(decryptedMessage);
  };

  /**
   * Seals (encrypts) the provided message for a receiver with the specified public key.
   *
   * @param {bigint | number} value - The message to be encrypted.
   * @param {string} publicKey - The public key of the intended recipient.
   * @returns string - The encrypted message in hexadecimal format.
   * @static
   * @throws Will throw if the provided publicKey or value do not meet defined preconditions.
   */
  static seal = (
    value: bigint | number,
    publicKey: string,
  ): EthEncryptedData => {
    isString(publicKey);
    isBigIntOrNumber(value);

    // generate ephemeral keypair
    const ephemeralKeyPair = nacl.box.keyPair();

    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const encryptedMessage = nacl.box(
      toBeArray(value),
      nonce,
      fromHexString(publicKey),
      ephemeralKeyPair.secretKey,
    );

    return {
      data: encryptedMessage,
      public_key: ephemeralKeyPair.publicKey,
      nonce: nonce,
    };
  };
}

/**
 * Asynchronously generates a new SealingKey.
 * This function uses the 'nacl' library to create a new public/private key pair for sealing purposes.
 * A sealing key is used to encrypt data such that it can only be unsealed (decrypted) by the owner of the corresponding private key.
 * @returns {Promise<SealingKey>} - A promise that resolves to a new SealingKey object containing the hexadecimal strings of the public and private keys.
 */
export const GenerateSealingKey = async (): Promise<SealingKey> => {
  const sodiumKeypair = nacl.box.keyPair();

  return new SealingKey(
    toHexString(sodiumKeypair.secretKey),
    toHexString(sodiumKeypair.publicKey),
  );
};
