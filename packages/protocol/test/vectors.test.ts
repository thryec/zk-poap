import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type BabyJubSignature,
  createProtocolCrypto,
  type EventRecord,
  hashMetadata,
  hashRelayUrl,
} from "../src/index.js";

interface VectorSignature {
  r8x: string;
  r8y: string;
  s: string;
}

interface VectorV1 {
  privateKeyHex: string;
  metadata: { name: string; description: string; locationLabel: string };
  relayUrl: string;
  masterSecret: string;
  event: {
    protocolVersion: 1;
    circuitVersion: 1;
    pkEventX: string;
    pkEventY: string;
    metadataHash: string;
    eventStart: string;
    eventEnd: string;
  };
  eventId: string;
  eventSecret: string;
  commitment: string;
  relayUrlHash: string;
  sessionId: string;
  qrNonce: string;
  qrExpiresAt: string;
  qrMessage: string;
  qrSignature: VectorSignature;
  issuedAt: string;
  credentialId: string;
  assuranceLevel: string;
  credentialMessage: string;
  credentialSignature: VectorSignature;
  verifierDomainOrChainId: string;
  verifierId: string;
  actionId: string;
  recipient: string;
  useContext: string;
  nullifier: string;
}

const fixturePath = fileURLToPath(new URL("./fixtures/v1.json", import.meta.url));

async function loadVector(): Promise<VectorV1> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as VectorV1;
}

function signatureFromVector(signature: VectorSignature): BabyJubSignature {
  return {
    r8x: BigInt(signature.r8x),
    r8y: BigInt(signature.r8y),
    s: BigInt(signature.s),
  };
}

function eventFromVector(vector: VectorV1): EventRecord {
  return {
    protocolVersion: vector.event.protocolVersion,
    circuitVersion: vector.event.circuitVersion,
    pkEventX: BigInt(vector.event.pkEventX),
    pkEventY: BigInt(vector.event.pkEventY),
    metadataHash: BigInt(vector.event.metadataHash),
    eventStart: BigInt(vector.event.eventStart),
    eventEnd: BigInt(vector.event.eventEnd),
  };
}

describe("reviewed v1 vectors", () => {
  it("matches every published hash, derivation, and signature", async () => {
    const vector = await loadVector();
    const crypto = await createProtocolCrypto();
    const privateKey = Uint8Array.from(Buffer.from(vector.privateKeyHex, "hex"));
    const event = eventFromVector(vector);
    const publicKey = crypto.publicKey(privateKey);

    expect(publicKey).toEqual([BigInt(vector.event.pkEventX), BigInt(vector.event.pkEventY)]);
    expect(hashMetadata(vector.metadata)).toBe(BigInt(vector.event.metadataHash));
    expect(hashRelayUrl(vector.relayUrl)).toBe(BigInt(vector.relayUrlHash));
    expect(crypto.computeEventId(event)).toBe(BigInt(vector.eventId));
    expect(crypto.deriveEventSecret(BigInt(vector.masterSecret), BigInt(vector.eventId))).toBe(
      BigInt(vector.eventSecret),
    );
    expect(crypto.deriveCommitment(BigInt(vector.masterSecret), BigInt(vector.eventId))).toBe(
      BigInt(vector.commitment),
    );

    const qrMessage = crypto.computeQrMessage(
      BigInt(vector.eventId),
      BigInt(vector.relayUrlHash),
      BigInt(vector.sessionId),
      BigInt(vector.qrNonce),
      BigInt(vector.qrExpiresAt),
    );
    expect(qrMessage).toBe(BigInt(vector.qrMessage));
    expect(
      crypto.verifyFieldSignature(publicKey, qrMessage, signatureFromVector(vector.qrSignature)),
    ).toBe(true);

    const credentialMessage = crypto.computeCredentialMessage(
      BigInt(vector.eventId),
      BigInt(vector.commitment),
      BigInt(vector.issuedAt),
      BigInt(vector.credentialId),
      BigInt(vector.assuranceLevel),
    );
    expect(credentialMessage).toBe(BigInt(vector.credentialMessage));
    expect(
      crypto.verifyFieldSignature(
        publicKey,
        credentialMessage,
        signatureFromVector(vector.credentialSignature),
      ),
    ).toBe(true);

    expect(
      crypto.computeUseContext(
        BigInt(vector.verifierDomainOrChainId),
        BigInt(vector.verifierId),
        BigInt(vector.actionId),
        BigInt(vector.recipient),
      ),
    ).toBe(BigInt(vector.useContext));
    expect(
      crypto.computeNullifier(
        BigInt(vector.masterSecret),
        BigInt(vector.eventId),
        BigInt(vector.useContext),
      ),
    ).toBe(BigInt(vector.nullifier));
  });

  it("rejects every single-field QR mutation", async () => {
    const vector = await loadVector();
    const crypto = await createProtocolCrypto();
    const publicKey = [BigInt(vector.event.pkEventX), BigInt(vector.event.pkEventY)] as const;
    const original = [
      BigInt(vector.eventId),
      BigInt(vector.relayUrlHash),
      BigInt(vector.sessionId),
      BigInt(vector.qrNonce),
      BigInt(vector.qrExpiresAt),
    ] as const;
    const signature = signatureFromVector(vector.qrSignature);

    for (const [index, value] of original.entries()) {
      const changed = [...original] as [bigint, bigint, bigint, bigint, bigint];
      changed[index] = value + 1n;
      const message = crypto.computeQrMessage(...changed);
      expect(crypto.verifyFieldSignature(publicKey, message, signature), `QR field ${index}`).toBe(
        false,
      );
    }
  });

  it("rejects every single-field credential and signature mutation", async () => {
    const vector = await loadVector();
    const crypto = await createProtocolCrypto();
    const publicKey = [BigInt(vector.event.pkEventX), BigInt(vector.event.pkEventY)] as const;
    const original = [
      BigInt(vector.eventId),
      BigInt(vector.commitment),
      BigInt(vector.issuedAt),
      BigInt(vector.credentialId),
      BigInt(vector.assuranceLevel),
    ] as const;
    const signature = signatureFromVector(vector.credentialSignature);

    for (const [index, value] of original.entries()) {
      const changed = [...original] as [bigint, bigint, bigint, bigint, bigint];
      changed[index] = value + 1n;
      const message = crypto.computeCredentialMessage(...changed);
      expect(
        crypto.verifyFieldSignature(publicKey, message, signature),
        `credential field ${index}`,
      ).toBe(false);
    }

    const message = BigInt(vector.credentialMessage);
    for (const field of ["r8x", "r8y", "s"] as const) {
      expect(
        crypto.verifyFieldSignature(publicKey, message, {
          ...signature,
          [field]: signature[field] + 1n,
        }),
        `signature field ${field}`,
      ).toBe(false);
    }
  });
});
