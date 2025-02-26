import { fromHexString, toBeArray, toBigInt, toHexString } from "./utils";
import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { isBigIntOrNumber, isString } from "./validation";

const PRIVATE_KEY_LENGTH = 64;
const PUBLIC_KEY_LENGTH = 64;

// This structure has been cloned from metamask's signing util, which is licensed under
// ISC, a copy of which can be found in the /licenses folder
export type EthEncryptedData = {
  version: string;
  nonce: string;
  ephemPublicKey: string;
  ciphertext: string;
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

  /**
   * Unseals (decrypts) the provided ciphertext using the instance's private key.
   *
   * @param {string | Uint8Array} ciphertext - The encrypted data to be decrypted.
   * @returns BigInt - The decrypted message as a bigint.
   * @throws Will throw an error if the decryption process fails.
   */
  unseal = (ciphertext: string | Uint8Array): bigint => {
    let parsedData: EthEncryptedData | undefined = undefined;
    try {
      if (typeof ciphertext === "string") {
        parsedData = JSON.parse(ciphertext);
      }
    } catch {
      // ignore errors
    }
    if (!parsedData) {
      const toDecrypt =
        typeof ciphertext === "string" ? fromHexString(ciphertext) : ciphertext;

      // decode json structure that gets returned from the chain
      const jsonString = Buffer.from(toDecrypt).toString("utf8");
      parsedData = JSON.parse(jsonString);
    }

    if (!parsedData) {
      throw new Error("Failed to parse sealed data");
    }

    // assemble decryption parameters
    const nonce = naclUtil.decodeBase64(parsedData.nonce);
    const ephemPublicKey = naclUtil.decodeBase64(parsedData.ephemPublicKey);
    const dataToDecrypt = naclUtil.decodeBase64(parsedData.ciphertext);
    // call the nacl box function to decrypt the data
    const decryptedMessage = nacl.box.open(
      dataToDecrypt,
      nonce,
      ephemPublicKey,
      fromHexString(this.privateKey),
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
  static seal = (value: bigint | number, publicKey: string): string => {
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

    // handle encrypted data
    const output = {
      version: "x25519-xsalsa20-poly1305",
      nonce: naclUtil.encodeBase64(nonce),
      ephemPublicKey: naclUtil.encodeBase64(ephemeralKeyPair.publicKey),
      ciphertext: naclUtil.encodeBase64(encryptedMessage),
    };

    // mimicking encoding from the chain
    return toHexString(Buffer.from(JSON.stringify(output)));
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
