import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createProtocolCrypto, type EventRecord } from "@pop/protocol";

interface VectorV1 {
  privateKeyHex: string;
  masterSecret: string;
  event: {
    pkEventX: string;
    pkEventY: string;
    metadataHash: string;
    eventStart: string;
    eventEnd: string;
  };
  eventId: string;
  issuedAt: string;
  credentialId: string;
  assuranceLevel: string;
  credentialSignature: { r8x: string; r8y: string; s: string };
  useContext: string;
  nullifier: string;
}

export interface CircuitInputV1 {
  [key: string]: string;
  pkEventX: string;
  pkEventY: string;
  metadataHash: string;
  eventStart: string;
  eventEnd: string;
  minimumAssuranceLevel: string;
  useContext: string;
  masterSecret: string;
  issuedAt: string;
  credentialId: string;
  assuranceLevel: string;
  sigR8x: string;
  sigR8y: string;
  sigS: string;
}

export interface ReviewedCircuitInput {
  input: CircuitInputV1;
  expectedEventId: string;
  expectedNullifier: string;
}

const fixturePath = fileURLToPath(new URL("../../protocol/test/fixtures/v1.json", import.meta.url));

async function loadVector(): Promise<VectorV1> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as VectorV1;
}

export async function validCircuitInputFromFixture(): Promise<ReviewedCircuitInput> {
  const vector = await loadVector();
  return {
    input: {
      pkEventX: vector.event.pkEventX,
      pkEventY: vector.event.pkEventY,
      metadataHash: vector.event.metadataHash,
      eventStart: vector.event.eventStart,
      eventEnd: vector.event.eventEnd,
      minimumAssuranceLevel: "1",
      useContext: vector.useContext,
      masterSecret: vector.masterSecret,
      issuedAt: vector.issuedAt,
      credentialId: vector.credentialId,
      assuranceLevel: vector.assuranceLevel,
      sigR8x: vector.credentialSignature.r8x,
      sigR8y: vector.credentialSignature.r8y,
      sigS: vector.credentialSignature.s,
    },
    expectedEventId: vector.eventId,
    expectedNullifier: vector.nullifier,
  };
}

export async function signedCircuitInput(
  overrides: Partial<CircuitInputV1>,
): Promise<ReviewedCircuitInput> {
  const vector = await loadVector();
  const reviewed = await validCircuitInputFromFixture();
  const input: CircuitInputV1 = { ...reviewed.input };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) input[key] = value;
  }
  const crypto = await createProtocolCrypto();
  const event: EventRecord = {
    protocolVersion: 1,
    circuitVersion: 1,
    pkEventX: BigInt(input.pkEventX),
    pkEventY: BigInt(input.pkEventY),
    metadataHash: BigInt(input.metadataHash),
    eventStart: BigInt(input.eventStart),
    eventEnd: BigInt(input.eventEnd),
  };
  const eventId = crypto.computeEventId(event);
  const commitment = crypto.deriveCommitment(BigInt(input.masterSecret), eventId);
  const message = crypto.computeCredentialMessage(
    eventId,
    commitment,
    BigInt(input.issuedAt),
    BigInt(input.credentialId),
    BigInt(input.assuranceLevel),
  );
  const privateKey = Uint8Array.from(Buffer.from(vector.privateKeyHex, "hex"));
  const signature = crypto.signField(privateKey, message);

  input.sigR8x = signature.r8x.toString();
  input.sigR8y = signature.r8y.toString();
  input.sigS = signature.s.toString();

  return {
    input,
    expectedEventId: eventId.toString(),
    expectedNullifier: crypto
      .computeNullifier(BigInt(input.masterSecret), eventId, BigInt(input.useContext))
      .toString(),
  };
}
