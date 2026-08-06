import {
  ASSURANCE_OPEN_ROTATING_QR,
  CIRCUIT_VERSION,
  createProtocolCrypto,
  hashMetadata,
  hashRelayUrl,
  PROTOCOL_VERSION,
} from "../src/index.js";

const privateKey = Uint8Array.from({ length: 32 }, (_, index) => index);
const privateKeyHex = Array.from(privateKey, (byte) => byte.toString(16).padStart(2, "0")).join("");
const metadata = {
  name: "ZK Meetup",
  description: "Protocol night",
  locationLabel: "Main Hall",
};
const relayUrl = "https://relay.example/ws";
const masterSecret = 123456789n;
const eventStart = 1_800_000_000n;
const eventEnd = 1_800_003_600n;
const sessionId = 101n;
const qrNonce = 102n;
const qrExpiresAt = 1_800_000_040n;
const issuedAt = 1_800_000_010n;
const credentialId = 201n;
const verifierDomainOrChainId = 301n;
const verifierId = 302n;
const actionId = 303n;
const recipient = 0n;

const crypto = await createProtocolCrypto();
const [pkEventX, pkEventY] = crypto.publicKey(privateKey);
const metadataHash = hashMetadata(metadata);
const event = {
  protocolVersion: PROTOCOL_VERSION,
  circuitVersion: CIRCUIT_VERSION,
  pkEventX,
  pkEventY,
  metadataHash,
  eventStart,
  eventEnd,
};
const eventId = crypto.computeEventId(event);
const eventSecret = crypto.deriveEventSecret(masterSecret, eventId);
const commitment = crypto.deriveCommitment(masterSecret, eventId);
const relayUrlHash = hashRelayUrl(relayUrl);
const qrMessage = crypto.computeQrMessage(eventId, relayUrlHash, sessionId, qrNonce, qrExpiresAt);
const qrSignature = crypto.signField(privateKey, qrMessage);
const credentialMessage = crypto.computeCredentialMessage(
  eventId,
  commitment,
  issuedAt,
  credentialId,
  ASSURANCE_OPEN_ROTATING_QR,
);
const credentialSignature = crypto.signField(privateKey, credentialMessage);
const useContext = crypto.computeUseContext(
  verifierDomainOrChainId,
  verifierId,
  actionId,
  recipient,
);
const nullifier = crypto.computeNullifier(masterSecret, eventId, useContext);

const vector = {
  privateKeyHex,
  metadata,
  relayUrl,
  masterSecret,
  event,
  eventId,
  eventSecret,
  commitment,
  relayUrlHash,
  sessionId,
  qrNonce,
  qrExpiresAt,
  qrMessage,
  qrSignature,
  issuedAt,
  credentialId,
  assuranceLevel: ASSURANCE_OPEN_ROTATING_QR,
  credentialMessage,
  credentialSignature,
  verifierDomainOrChainId,
  verifierId,
  actionId,
  recipient,
  useContext,
  nullifier,
};

console.log(
  JSON.stringify(
    vector,
    (_, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
