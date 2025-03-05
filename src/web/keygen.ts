import { TfheClientKey, TfheCompactPublicKey, TfheConfigBuilder } from "tfhe";
import { toHexString } from "../core/utils";

export const createTfheKeypair = () => {
  const config = TfheConfigBuilder.default().build();
  const clientKey = TfheClientKey.generate(config);
  let publicKey = TfheCompactPublicKey.new(clientKey);
  publicKey = TfheCompactPublicKey.deserialize(publicKey.serialize());
  return { clientKey, publicKey };
};

export const createTfhePublicKey = () => {
  const { publicKey } = createTfheKeypair();
  return toHexString(publicKey.serialize());
};
