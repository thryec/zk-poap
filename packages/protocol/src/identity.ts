import { createProtocolCrypto } from "./crypto.js";

export async function deriveEventSecret(masterSecret: bigint, eventId: bigint): Promise<bigint> {
  return (await createProtocolCrypto()).deriveEventSecret(masterSecret, eventId);
}

export async function deriveCommitment(masterSecret: bigint, eventId: bigint): Promise<bigint> {
  return (await createProtocolCrypto()).deriveCommitment(masterSecret, eventId);
}
