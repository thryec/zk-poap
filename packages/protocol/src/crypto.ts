import { buildEddsa, buildPoseidon } from "circomlibjs";
import { CIRCUIT_VERSION, DOMAIN } from "./constants.js";
import { stringifyField } from "./field.js";
import type { BabyJubSignature, EventRecord } from "./types.js";

export interface ProtocolCrypto {
  poseidon(inputs: readonly bigint[]): bigint;
  publicKey(privateKey: Uint8Array): readonly [bigint, bigint];
  signField(privateKey: Uint8Array, message: bigint): BabyJubSignature;
  verifyFieldSignature(
    publicKey: readonly [bigint, bigint],
    message: bigint,
    signature: BabyJubSignature,
  ): boolean;
  computeEventId(event: EventRecord): bigint;
  deriveEventSecret(masterSecret: bigint, eventId: bigint): bigint;
  deriveCommitment(masterSecret: bigint, eventId: bigint): bigint;
  computeQrMessage(
    eventId: bigint,
    relayUrlHash: bigint,
    sessionId: bigint,
    qrNonce: bigint,
    expiresAt: bigint,
  ): bigint;
  computeCredentialMessage(
    eventId: bigint,
    commitment: bigint,
    issuedAt: bigint,
    credentialId: bigint,
    assuranceLevel: bigint,
  ): bigint;
  computeUseContext(
    verifierDomainOrChainId: bigint,
    verifierId: bigint,
    actionId: bigint,
    recipient: bigint,
  ): bigint;
  computeNullifier(masterSecret: bigint, eventId: bigint, useContext: bigint): bigint;
}

function requirePrivateKey(privateKey: Uint8Array): void {
  if (privateKey.length !== 32) throw new TypeError("Expected a 32-byte private key");
}

function requireNonzeroMasterSecret(masterSecret: bigint): void {
  stringifyField(masterSecret);
  if (masterSecret === 0n) throw new RangeError("Expected a nonzero master secret");
}

let protocolCryptoPromise: Promise<ProtocolCrypto> | undefined;

async function initializeProtocolCrypto(): Promise<ProtocolCrypto> {
  const [poseidonImpl, eddsa] = await Promise.all([buildPoseidon(), buildEddsa()]);

  const poseidon = (inputs: readonly bigint[]): bigint => {
    for (const input of inputs) stringifyField(input);
    return BigInt(poseidonImpl.F.toObject(poseidonImpl(inputs)));
  };

  const publicKey = (privateKey: Uint8Array): readonly [bigint, bigint] => {
    requirePrivateKey(privateKey);
    const point = eddsa.prv2pub(privateKey);
    return [BigInt(eddsa.F.toObject(point[0])), BigInt(eddsa.F.toObject(point[1]))];
  };

  const signField = (privateKey: Uint8Array, message: bigint): BabyJubSignature => {
    requirePrivateKey(privateKey);
    stringifyField(message);
    const signature = eddsa.signPoseidon(privateKey, eddsa.F.e(message));
    return {
      r8x: BigInt(eddsa.F.toObject(signature.R8[0])),
      r8y: BigInt(eddsa.F.toObject(signature.R8[1])),
      s: BigInt(signature.S),
    };
  };

  const verifyFieldSignature = (
    key: readonly [bigint, bigint],
    message: bigint,
    signature: BabyJubSignature,
  ): boolean => {
    try {
      stringifyField(key[0]);
      stringifyField(key[1]);
      stringifyField(message);
      stringifyField(signature.r8x);
      stringifyField(signature.r8y);
      stringifyField(signature.s);
      return eddsa.verifyPoseidon(
        eddsa.F.e(message),
        {
          R8: [eddsa.F.e(signature.r8x), eddsa.F.e(signature.r8y)],
          S: signature.s,
        },
        [eddsa.F.e(key[0]), eddsa.F.e(key[1])],
      );
    } catch {
      return false;
    }
  };

  const computeEventId = (event: EventRecord): bigint =>
    poseidon([
      DOMAIN.event,
      BigInt(CIRCUIT_VERSION),
      event.pkEventX,
      event.pkEventY,
      event.metadataHash,
      event.eventStart,
      event.eventEnd,
    ]);

  const deriveEventSecret = (masterSecret: bigint, eventId: bigint): bigint => {
    requireNonzeroMasterSecret(masterSecret);
    return poseidon([DOMAIN.userEvent, masterSecret, eventId]);
  };

  const deriveCommitment = (masterSecret: bigint, eventId: bigint): bigint =>
    poseidon([DOMAIN.commitment, deriveEventSecret(masterSecret, eventId)]);

  const computeQrMessage = (
    eventId: bigint,
    relayUrlHash: bigint,
    sessionId: bigint,
    qrNonce: bigint,
    expiresAt: bigint,
  ): bigint => poseidon([DOMAIN.qr, eventId, relayUrlHash, sessionId, qrNonce, expiresAt]);

  const computeCredentialMessage = (
    eventId: bigint,
    commitment: bigint,
    issuedAt: bigint,
    credentialId: bigint,
    assuranceLevel: bigint,
  ): bigint =>
    poseidon([DOMAIN.credential, eventId, commitment, issuedAt, credentialId, assuranceLevel]);

  const computeUseContext = (
    verifierDomainOrChainId: bigint,
    verifierId: bigint,
    actionId: bigint,
    recipient: bigint,
  ): bigint => poseidon([DOMAIN.context, verifierDomainOrChainId, verifierId, actionId, recipient]);

  const computeNullifier = (masterSecret: bigint, eventId: bigint, useContext: bigint): bigint =>
    poseidon([DOMAIN.nullifier, deriveEventSecret(masterSecret, eventId), useContext]);

  return {
    poseidon,
    publicKey,
    signField,
    verifyFieldSignature,
    computeEventId,
    deriveEventSecret,
    deriveCommitment,
    computeQrMessage,
    computeCredentialMessage,
    computeUseContext,
    computeNullifier,
  };
}

export function createProtocolCrypto(): Promise<ProtocolCrypto> {
  protocolCryptoPromise ??= initializeProtocolCrypto();
  return protocolCryptoPromise;
}

export async function signField(
  privateKey: Uint8Array,
  message: bigint,
): Promise<BabyJubSignature> {
  return (await createProtocolCrypto()).signField(privateKey, message);
}

export async function verifyFieldSignature(
  publicKey: readonly [bigint, bigint],
  message: bigint,
  signature: BabyJubSignature,
): Promise<boolean> {
  return (await createProtocolCrypto()).verifyFieldSignature(publicKey, message, signature);
}
