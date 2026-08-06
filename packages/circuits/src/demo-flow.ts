import { randomBytes } from "node:crypto";
import {
  ASSURANCE_OPEN_ROTATING_QR,
  type AttendancePublicSignals,
  CIRCUIT_VERSION,
  type Credential,
  createProtocolCrypto,
  type EventRecord,
  FIELD_MODULUS,
  hashMetadata,
  mapPublicSignals,
  PROTOCOL_VERSION,
  PUBLIC_SIGNAL_ORDER,
} from "@pop/protocol";
import { proveAttendanceCredential, verifyAttendanceProof } from "./prove-reviewed-vector.js";

export interface DemoFlowResult {
  credentialIssued: true;
  proofVerified: true;
  tamperRejected: true;
  publicSignals: Record<keyof AttendancePublicSignals, string>;
}

function randomField(): bigint {
  while (true) {
    const value = BigInt(`0x${randomBytes(32).toString("hex")}`);
    if (value > 0n && value < FIELD_MODULUS) return value;
  }
}

export async function runDemoFlow(): Promise<DemoFlowResult> {
  const crypto = await createProtocolCrypto();
  const privateKey = randomBytes(32);
  const masterSecret = randomField();
  const issuedAt = BigInt(Math.floor(Date.now() / 1_000));
  const metadata = {
    name: "zk-poap command-line demo",
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
  const commitment = crypto.deriveCommitment(masterSecret, eventId);
  const credentialId = randomField();
  const message = crypto.computeCredentialMessage(
    eventId,
    commitment,
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
  const { proof, publicSignals, verificationKey } = await proveAttendanceCredential({
    credential,
    masterSecret,
    minimumAssuranceLevel: ASSURANCE_OPEN_ROTATING_QR,
    useContext,
  });

  const tamperedSignals = [...publicSignals];
  tamperedSignals[0] = ((BigInt(tamperedSignals[0] as string) + 1n) % FIELD_MODULUS).toString();
  if (await verifyAttendanceProof(verificationKey, tamperedSignals, proof)) {
    throw new Error("A proof with a changed public event ID was accepted.");
  }

  const mapped = mapPublicSignals(publicSignals);
  const exposedSignals = Object.fromEntries(
    PUBLIC_SIGNAL_ORDER.map((name) => [name, mapped[name].toString()]),
  ) as Record<keyof AttendancePublicSignals, string>;

  return {
    credentialIssued: true,
    proofVerified: true,
    tamperRejected: true,
    publicSignals: exposedSignals,
  };
}
