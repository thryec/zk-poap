export interface BabyJubSignature {
  r8x: bigint;
  r8y: bigint;
  s: bigint;
}

export interface EventMetadata {
  name: string;
  description?: string;
  locationLabel?: string;
}

export interface EventRecord {
  protocolVersion: 1;
  circuitVersion: 1;
  pkEventX: bigint;
  pkEventY: bigint;
  metadataHash: bigint;
  eventStart: bigint;
  eventEnd: bigint;
}

export interface QrClaim {
  metadata: EventMetadata;
  event: EventRecord;
  eventId: bigint;
  relayUrl: string;
  sessionId: bigint;
  qrNonce: bigint;
  expiresAt: bigint;
  signature: BabyJubSignature;
}

export interface ClaimRequest {
  type: "claim.request";
  sessionId: bigint;
  eventId: bigint;
  qrNonce: bigint;
  commitment: bigint;
  requestId: string;
}

export interface Credential {
  protocolVersion: 1;
  circuitVersion: 1;
  metadata: EventMetadata;
  event: EventRecord;
  eventId: bigint;
  issuedAt: bigint;
  credentialId: bigint;
  assuranceLevel: bigint;
  signature: BabyJubSignature;
}

export interface SessionOpen {
  type: "session.open";
  sessionId: bigint;
  adminToken: string;
}

export interface SessionReady {
  type: "session.ready";
  sessionId: bigint;
}

export interface ClaimResponse {
  type: "claim.response";
  requestId: string;
  credential: Credential;
}

export const RELAY_ERROR_CODES = [
  "INVALID_MESSAGE",
  "MESSAGE_TOO_LARGE",
  "SESSION_OFFLINE",
  "SESSION_CONFLICT",
  "REQUEST_TIMEOUT",
  "RATE_LIMITED",
] as const;

export type RelayErrorCode = (typeof RELAY_ERROR_CODES)[number];

export interface RelayError {
  type: "relay.error";
  code: RelayErrorCode;
  requestId?: string;
}

export type RelayMessage = SessionOpen | SessionReady | ClaimRequest | ClaimResponse | RelayError;

export interface VerifierRequest {
  protocolVersion: 1;
  circuitVersion: 1;
  event: EventRecord;
  eventId: bigint;
  minimumAssuranceLevel: bigint;
  verifierDomainOrChainId: bigint;
  verifierId: bigint;
  actionId: bigint;
  recipient: bigint;
  useContext: bigint;
  expiresAt: bigint;
  actionLabel: string;
}

export interface Groth16ProofWire {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: "groth16";
  curve: "bn128";
}

export interface ProofPackage {
  protocolVersion: 1;
  circuitVersion: 1;
  proof: Groth16ProofWire;
  publicSignals: [string, string, string, string, string, string, string, string, string];
  eventId: bigint;
  useContext: bigint;
}

export interface WireBabyJubSignature {
  r8x: string;
  r8y: string;
  s: string;
}

export interface WireEventRecord {
  protocolVersion: 1;
  circuitVersion: 1;
  pkEventX: string;
  pkEventY: string;
  metadataHash: string;
  eventStart: string;
  eventEnd: string;
}

export interface WireCredential {
  protocolVersion: 1;
  circuitVersion: 1;
  metadata: EventMetadata;
  event: WireEventRecord;
  eventId: string;
  issuedAt: string;
  credentialId: string;
  assuranceLevel: string;
  signature: WireBabyJubSignature;
}
