import { createProtocolCrypto } from "./crypto.js";

export async function computeCredentialMessage(
  eventId: bigint,
  commitment: bigint,
  issuedAt: bigint,
  credentialId: bigint,
  assuranceLevel: bigint,
): Promise<bigint> {
  return (await createProtocolCrypto()).computeCredentialMessage(
    eventId,
    commitment,
    issuedAt,
    credentialId,
    assuranceLevel,
  );
}
