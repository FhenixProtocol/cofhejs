export type VerifyResultRaw = {
  ct_hash: string;
  signature: string;
  recid: number;
};

export type VerifyResult = {
  ct_hash: string;
  signature: string;
};
