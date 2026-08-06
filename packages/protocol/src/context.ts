import { createProtocolCrypto } from "./crypto.js";

export async function computeUseContext(
  verifierDomainOrChainId: bigint,
  verifierId: bigint,
  actionId: bigint,
  recipient: bigint,
): Promise<bigint> {
  return (await createProtocolCrypto()).computeUseContext(
    verifierDomainOrChainId,
    verifierId,
    actionId,
    recipient,
  );
}

export async function computeNullifier(
  masterSecret: bigint,
  eventId: bigint,
  useContext: bigint,
): Promise<bigint> {
  return (await createProtocolCrypto()).computeNullifier(masterSecret, eventId, useContext);
}
