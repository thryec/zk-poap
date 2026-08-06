import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  type Credential,
  createProtocolCrypto,
  hashMetadata,
  mapPublicSignals,
} from "@pop/protocol";
import { type Groth16Proof, groth16 } from "snarkjs";

interface VectorV1 {
  metadata: Credential["metadata"];
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
  masterSecret: string;
  issuedAt: string;
  credentialId: string;
  assuranceLevel: string;
  credentialSignature: { r8x: string; r8y: string; s: string };
  useContext: string;
  nullifier: string;
}

export interface AttendanceProofRequest {
  credential: Credential;
  masterSecret: bigint;
  minimumAssuranceLevel: bigint;
  useContext: bigint;
}

export interface ReviewedProof {
  proof: Groth16Proof;
  publicSignals: string[];
  verificationKey: unknown;
}

const fixturePath = fileURLToPath(new URL("../../protocol/test/fixtures/v1.json", import.meta.url));
const wasmPath = fileURLToPath(
  new URL("../build/v1/attendance_js/attendance.wasm", import.meta.url),
);
const zkeyPath = fileURLToPath(new URL("../build/v1/attendance_dev.zkey", import.meta.url));
const verificationKeyPath = fileURLToPath(
  new URL("../build/v1/verification_key.dev.json", import.meta.url),
);

async function loadVerificationKey(): Promise<unknown> {
  for (const path of [wasmPath, zkeyPath, verificationKeyPath]) {
    try {
      await access(path);
    } catch {
      throw new Error(`Missing Groth16 artifact: ${path}. Run pnpm artifacts:dev first.`);
    }
  }
  return JSON.parse(await readFile(verificationKeyPath, "utf8")) as unknown;
}

export async function verifyAttendanceProof(
  verificationKey: unknown,
  publicSignals: string[],
  proof: Groth16Proof,
): Promise<boolean> {
  try {
    mapPublicSignals(publicSignals);
    return await groth16.verify(verificationKey, publicSignals, proof);
  } catch {
    return false;
  }
}

export async function proveAttendanceCredential(
  request: AttendanceProofRequest,
): Promise<ReviewedProof> {
  const verificationKey = await loadVerificationKey();
  const { credential, masterSecret, minimumAssuranceLevel, useContext } = request;
  const crypto = await createProtocolCrypto();

  if (hashMetadata(credential.metadata) !== credential.event.metadataHash) {
    throw new Error("Credential metadata does not match its event hash.");
  }
  const eventId = crypto.computeEventId(credential.event);
  if (eventId !== credential.eventId) {
    throw new Error("Credential event ID does not match its event record.");
  }

  const commitment = crypto.deriveCommitment(masterSecret, eventId);
  const message = crypto.computeCredentialMessage(
    eventId,
    commitment,
    credential.issuedAt,
    credential.credentialId,
    credential.assuranceLevel,
  );
  if (
    !crypto.verifyFieldSignature(
      [credential.event.pkEventX, credential.event.pkEventY],
      message,
      credential.signature,
    )
  ) {
    throw new Error("Credential signature is invalid.");
  }

  const input = {
    pkEventX: credential.event.pkEventX,
    pkEventY: credential.event.pkEventY,
    metadataHash: credential.event.metadataHash,
    eventStart: credential.event.eventStart,
    eventEnd: credential.event.eventEnd,
    minimumAssuranceLevel,
    useContext,
    masterSecret,
    issuedAt: credential.issuedAt,
    credentialId: credential.credentialId,
    assuranceLevel: credential.assuranceLevel,
    sigR8x: credential.signature.r8x,
    sigR8y: credential.signature.r8y,
    sigS: credential.signature.s,
  };

  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);
  const signals = mapPublicSignals(publicSignals);
  const expected = {
    eventId,
    nullifier: crypto.computeNullifier(masterSecret, eventId, useContext),
    pkEventX: credential.event.pkEventX,
    pkEventY: credential.event.pkEventY,
    metadataHash: credential.event.metadataHash,
    eventStart: credential.event.eventStart,
    eventEnd: credential.event.eventEnd,
    minimumAssuranceLevel,
    useContext,
  };
  for (const [name, value] of Object.entries(expected)) {
    if (signals[name as keyof typeof signals] !== value) {
      throw new Error(`The proof emitted an unexpected ${name} public signal.`);
    }
  }

  if (!(await verifyAttendanceProof(verificationKey, publicSignals, proof))) {
    throw new Error("The Groth16 proof failed verification.");
  }

  return { proof, publicSignals, verificationKey };
}

export async function proveReviewedVector(): Promise<ReviewedProof> {
  const vector = JSON.parse(await readFile(fixturePath, "utf8")) as VectorV1;
  const credential: Credential = {
    protocolVersion: 1,
    circuitVersion: 1,
    metadata: vector.metadata,
    event: {
      protocolVersion: 1,
      circuitVersion: 1,
      pkEventX: BigInt(vector.event.pkEventX),
      pkEventY: BigInt(vector.event.pkEventY),
      metadataHash: BigInt(vector.event.metadataHash),
      eventStart: BigInt(vector.event.eventStart),
      eventEnd: BigInt(vector.event.eventEnd),
    },
    eventId: BigInt(vector.eventId),
    issuedAt: BigInt(vector.issuedAt),
    credentialId: BigInt(vector.credentialId),
    assuranceLevel: BigInt(vector.assuranceLevel),
    signature: {
      r8x: BigInt(vector.credentialSignature.r8x),
      r8y: BigInt(vector.credentialSignature.r8y),
      s: BigInt(vector.credentialSignature.s),
    },
  };

  const result = await proveAttendanceCredential({
    credential,
    masterSecret: BigInt(vector.masterSecret),
    minimumAssuranceLevel: 1n,
    useContext: BigInt(vector.useContext),
  });
  const signals = mapPublicSignals(result.publicSignals);
  if (signals.nullifier !== BigInt(vector.nullifier)) {
    throw new Error("The reviewed proof emitted an unexpected nullifier.");
  }
  return result;
}
