import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ASSURANCE_OPEN_ROTATING_QR,
  type AttendancePublicSignals,
  CIRCUIT_VERSION,
  type Credential,
  createProtocolCrypto,
  decodeCredential,
  decodeProofPackage,
  type EventRecord,
  encodeCredential,
  encodeProofPackage,
  FIELD_MODULUS,
  hashMetadata,
  mapPublicSignals,
  PROTOCOL_VERSION,
  type ProofPackage,
  PUBLIC_SIGNAL_ORDER,
  parseField,
} from "@pop/protocol";
import type { Groth16Proof } from "snarkjs";
import { proveAttendanceCredential, verifyAttendanceProof } from "./prove-reviewed-vector.js";

interface StoredCredentialState {
  credential: Credential;
  masterSecret: bigint;
  minimumAssuranceLevel: bigint;
  useContext: bigint;
}

export interface CredentialStepResult {
  credentialCreated: true;
  eventId: string;
  statePath: string;
}

export interface ProofStepResult {
  proofGenerated: true;
  proofPath: string;
}

const defaultStateDir = fileURLToPath(new URL("../../../.cache/example/", import.meta.url));
const verificationKeyPath = fileURLToPath(
  new URL("../build/v1/verification_key.dev.json", import.meta.url),
);

function randomField(): bigint {
  while (true) {
    const value = BigInt(`0x${randomBytes(32).toString("hex")}`);
    if (value > 0n && value < FIELD_MODULUS) return value;
  }
}

function statePaths(stateDir: string): { credential: string; proof: string } {
  return {
    credential: join(stateDir, "credential.private.json"),
    proof: join(stateDir, "proof.json"),
  };
}

async function writePrivateJson(path: string, value: unknown): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}

async function readCredentialState(stateDir: string): Promise<StoredCredentialState> {
  const value = JSON.parse(await readFile(statePaths(stateDir).credential, "utf8")) as {
    version?: unknown;
    credential?: unknown;
    masterSecret?: unknown;
    minimumAssuranceLevel?: unknown;
    useContext?: unknown;
  };
  if (
    value.version !== 1 ||
    typeof value.masterSecret !== "string" ||
    typeof value.minimumAssuranceLevel !== "string" ||
    typeof value.useContext !== "string"
  ) {
    throw new Error("Invalid private credential state.");
  }
  return {
    credential: decodeCredential(JSON.stringify(value.credential)),
    masterSecret: parseField(value.masterSecret),
    minimumAssuranceLevel: parseField(value.minimumAssuranceLevel),
    useContext: parseField(value.useContext),
  };
}

async function readProofPackage(stateDir: string): Promise<ProofPackage> {
  return decodeProofPackage(await readFile(statePaths(stateDir).proof, "utf8"));
}

async function readVerificationKey(): Promise<unknown> {
  return JSON.parse(await readFile(verificationKeyPath, "utf8")) as unknown;
}

export async function createExampleCredential(
  stateDir = defaultStateDir,
): Promise<CredentialStepResult> {
  const crypto = await createProtocolCrypto();
  const privateKey = randomBytes(32);
  const masterSecret = randomField();
  const issuedAt = BigInt(Math.floor(Date.now() / 1_000));
  const metadata = {
    name: "zk-poap end-to-end example",
    description: "A local development event",
  };
  const [pkEventX, pkEventY] = crypto.publicKey(privateKey);
  const event: EventRecord = {
    protocolVersion: PROTOCOL_VERSION,
    circuitVersion: CIRCUIT_VERSION,
    pkEventX,
    pkEventY,
    metadataHash: hashMetadata(metadata),
    eventStart: issuedAt - 60n,
    eventEnd: issuedAt + 3_600n,
  };
  const eventId = crypto.computeEventId(event);
  const credentialId = randomField();
  const message = crypto.computeCredentialMessage(
    eventId,
    crypto.deriveCommitment(masterSecret, eventId),
    issuedAt,
    credentialId,
    ASSURANCE_OPEN_ROTATING_QR,
  );
  const credential: Credential = {
    protocolVersion: PROTOCOL_VERSION,
    circuitVersion: CIRCUIT_VERSION,
    metadata,
    event,
    eventId,
    issuedAt,
    credentialId,
    assuranceLevel: ASSURANCE_OPEN_ROTATING_QR,
    signature: crypto.signField(privateKey, message),
  };
  const useContext = crypto.computeUseContext(1n, 1n, randomField(), 0n);
  const path = statePaths(stateDir).credential;
  await writePrivateJson(path, {
    version: 1,
    credential: JSON.parse(encodeCredential(credential)) as unknown,
    masterSecret: masterSecret.toString(),
    minimumAssuranceLevel: ASSURANCE_OPEN_ROTATING_QR.toString(),
    useContext: useContext.toString(),
  });
  return { credentialCreated: true, eventId: eventId.toString(), statePath: path };
}

export async function generateExampleProof(stateDir = defaultStateDir): Promise<ProofStepResult> {
  const state = await readCredentialState(stateDir);
  const result = await proveAttendanceCredential(state);
  const proofPackage = decodeProofPackage(
    JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      circuitVersion: CIRCUIT_VERSION,
      proof: result.proof,
      publicSignals: result.publicSignals,
      eventId: state.credential.eventId.toString(),
      useContext: state.useContext.toString(),
    }),
  );
  const path = statePaths(stateDir).proof;
  await writePrivateJson(path, JSON.parse(encodeProofPackage(proofPackage)) as unknown);
  return { proofGenerated: true, proofPath: path };
}

export async function verifyExampleProof(
  stateDir = defaultStateDir,
): Promise<{ proofVerified: true }> {
  const proofPackage = await readProofPackage(stateDir);
  const signals = mapPublicSignals(proofPackage.publicSignals);
  if (signals.eventId !== proofPackage.eventId || signals.useContext !== proofPackage.useContext) {
    throw new Error("Proof package fields do not match its public signals.");
  }
  const valid = await verifyAttendanceProof(
    await readVerificationKey(),
    [...proofPackage.publicSignals],
    proofPackage.proof as Groth16Proof,
  );
  if (!valid) throw new Error("Groth16 proof verification failed.");
  return { proofVerified: true };
}

export async function checkTamperedExampleProof(
  stateDir = defaultStateDir,
): Promise<{ tamperRejected: true }> {
  const proofPackage = await readProofPackage(stateDir);
  const changedSignals = [...proofPackage.publicSignals];
  changedSignals[0] = ((BigInt(changedSignals[0] as string) + 1n) % FIELD_MODULUS).toString();
  const accepted = await verifyAttendanceProof(
    await readVerificationKey(),
    changedSignals,
    proofPackage.proof as Groth16Proof,
  );
  if (accepted) throw new Error("A proof with a changed event ID was accepted.");
  return { tamperRejected: true };
}

export async function readExamplePublicSignals(
  stateDir = defaultStateDir,
): Promise<Record<keyof AttendancePublicSignals, string>> {
  const signals = mapPublicSignals((await readProofPackage(stateDir)).publicSignals);
  return Object.fromEntries(
    PUBLIC_SIGNAL_ORDER.map((name) => [name, signals[name].toString()]),
  ) as Record<keyof AttendancePublicSignals, string>;
}
