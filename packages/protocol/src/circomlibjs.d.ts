declare module "circomlibjs" {
  interface Field {
    e(value: bigint): Uint8Array;
    toObject(value: unknown): bigint;
  }

  interface Poseidon {
    (inputs: readonly bigint[]): unknown;
    F: Field;
  }

  interface InternalSignature {
    R8: [unknown, unknown];
    S: bigint;
  }

  interface Eddsa {
    F: Field;
    prv2pub(privateKey: Uint8Array): [unknown, unknown];
    signPoseidon(privateKey: Uint8Array, message: Uint8Array): InternalSignature;
    verifyPoseidon(
      message: Uint8Array,
      signature: InternalSignature,
      publicKey: [unknown, unknown],
    ): boolean;
  }

  export function buildPoseidon(): Promise<Poseidon>;
  export function buildEddsa(): Promise<Eddsa>;
}
