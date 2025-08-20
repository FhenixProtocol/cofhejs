import { EncryptableItem, VerifyResult } from "../../types";

type ZkPackFunction<B> = (items: EncryptableItem[]) => B;
type ZkProveFunction<B, P> = (
  builder: B,
  address: string,
  securityZone: number,
  chainId: string,
) => Promise<P>;
type ZkVerifyFunction<P> = (
  verifierUrl: string,
  compactList: P,
  address: string,
  securityZone: number,
  chainId: string,
) => Promise<VerifyResult[]>;

export class ZkPackProveVerify<B, P> {
  private zkPack: ZkPackFunction<B>;
  private zkProve: ZkProveFunction<B, P>;
  private zkVerify: ZkVerifyFunction<P>;

  constructor(
    zkPack: ZkPackFunction<B>,
    zkProve: ZkProveFunction<B, P>,
    zkVerify: ZkVerifyFunction<P>,
  ) {
    this.zkPack = zkPack;
    this.zkProve = zkProve;
    this.zkVerify = zkVerify;
  }

  pack(items: EncryptableItem[]): B {
    return this.zkPack(items);
  }

  prove(
    builder: B,
    address: string,
    securityZone: number,
    chainId: string,
  ): Promise<P> {
    return this.zkProve(builder, address, securityZone, chainId);
  }

  verify(
    verifierUrl: string,
    compactList: P,
    address: string,
    securityZone: number,
    chainId: string,
  ): Promise<VerifyResult[]> {
    return this.zkVerify(
      verifierUrl,
      compactList,
      address,
      securityZone,
      chainId,
    );
  }
}
