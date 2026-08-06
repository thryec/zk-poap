import { createProtocolCrypto } from "./crypto.js";

export async function computeQrMessage(
  eventId: bigint,
  relayUrlHash: bigint,
  sessionId: bigint,
  qrNonce: bigint,
  expiresAt: bigint,
): Promise<bigint> {
  return (await createProtocolCrypto()).computeQrMessage(
    eventId,
    relayUrlHash,
    sessionId,
    qrNonce,
    expiresAt,
  );
}
