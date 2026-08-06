import canonicalize from "canonicalize";
import { parseField, stringifyField } from "./field.js";
import { hashMetadata } from "./hash.js";
import {
  credentialWireSchema,
  proofPackageWireSchema,
  qrClaimWireSchema,
  relayMessageWireSchema,
  verifierRequestWireSchema,
} from "./schemas.js";
import type {
  BabyJubSignature,
  ClaimRequest,
  ClaimResponse,
  Credential,
  EventMetadata,
  EventRecord,
  ProofPackage,
  QrClaim,
  RelayError,
  RelayMessage,
  SessionOpen,
  SessionReady,
  VerifierRequest,
  WireBabyJubSignature,
  WireCredential,
  WireEventRecord,
} from "./types.js";

interface WireQrClaim {
  metadata: EventMetadata;
  event: WireEventRecord;
  eventId: string;
  relayUrl: string;
  sessionId: string;
  qrNonce: string;
  expiresAt: string;
  signature: WireBabyJubSignature;
}

interface WireVerifierRequest {
  protocolVersion: 1;
  circuitVersion: 1;
  event: WireEventRecord;
  eventId: string;
  minimumAssuranceLevel: string;
  verifierDomainOrChainId: string;
  verifierId: string;
  actionId: string;
  recipient: string;
  useContext: string;
  expiresAt: string;
  actionLabel: string;
}

function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) throw new TypeError("Value cannot be encoded as canonical JSON");
  return result;
}

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") return stringifyField(value);
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }
  return value;
}

export function encodeWire(value: unknown): string {
  return canonicalJson(toJsonValue(value));
}

function signatureFromWire(value: WireBabyJubSignature): BabyJubSignature {
  return { r8x: parseField(value.r8x), r8y: parseField(value.r8y), s: parseField(value.s) };
}

function eventFromWire(value: WireEventRecord): EventRecord {
  return {
    protocolVersion: value.protocolVersion,
    circuitVersion: value.circuitVersion,
    pkEventX: parseField(value.pkEventX),
    pkEventY: parseField(value.pkEventY),
    metadataHash: parseField(value.metadataHash),
    eventStart: parseField(value.eventStart),
    eventEnd: parseField(value.eventEnd),
  };
}

function credentialFromWire(value: WireCredential): Credential {
  return {
    protocolVersion: value.protocolVersion,
    circuitVersion: value.circuitVersion,
    metadata: value.metadata,
    event: eventFromWire(value.event),
    eventId: parseField(value.eventId),
    issuedAt: parseField(value.issuedAt),
    credentialId: parseField(value.credentialId),
    assuranceLevel: parseField(value.assuranceLevel),
    signature: signatureFromWire(value.signature),
  };
}

function requireMetadataHash(metadata: EventMetadata, event: EventRecord): void {
  if (hashMetadata(metadata) !== event.metadataHash) {
    throw new Error("Event metadata hash does not match event record");
  }
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new TypeError("Invalid base64url claim payload");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError("Invalid JSON wire message");
  }
}

function requireClaimUrl(value: string, allowPayload: boolean): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new TypeError("Expected a secure claim origin");
  }
  if (url.username || url.password || (!allowPayload && (url.hash || url.search))) {
    throw new TypeError("Claim origin must not include credentials, query, or fragment");
  }
  return url;
}

export function encodeQrClaimUrl(origin: string, claim: QrClaim): string {
  const base = requireClaimUrl(origin, false);
  const wire = qrClaimWireSchema.parse(toJsonValue(claim)) as WireQrClaim;
  requireMetadataHash(wire.metadata, eventFromWire(wire.event));

  const url = new URL("/claim", base.origin);
  url.hash = base64UrlEncode(canonicalJson(wire));
  return url.toString();
}

export function decodeQrClaim(text: string): QrClaim {
  const url = requireClaimUrl(text, true);
  if (url.pathname !== "/claim" || url.search || url.hash.length < 2) {
    throw new TypeError("Invalid claim URL");
  }

  const wire = qrClaimWireSchema.parse(
    parseJson(base64UrlDecode(url.hash.slice(1))),
  ) as WireQrClaim;
  const event = eventFromWire(wire.event);
  requireMetadataHash(wire.metadata, event);
  return {
    metadata: wire.metadata,
    event,
    eventId: parseField(wire.eventId),
    relayUrl: wire.relayUrl,
    sessionId: parseField(wire.sessionId),
    qrNonce: parseField(wire.qrNonce),
    expiresAt: parseField(wire.expiresAt),
    signature: signatureFromWire(wire.signature),
  };
}

export function encodeCredential(credential: Credential): string {
  const wire = credentialWireSchema.parse(toJsonValue(credential)) as WireCredential;
  requireMetadataHash(wire.metadata, eventFromWire(wire.event));
  return canonicalJson(wire);
}

export function decodeCredential(text: string): Credential {
  const wire = credentialWireSchema.parse(parseJson(text)) as WireCredential;
  const credential = credentialFromWire(wire);
  requireMetadataHash(credential.metadata, credential.event);
  return credential;
}

export function decodeRelayMessage(text: string): RelayMessage {
  const wire = relayMessageWireSchema.parse(parseJson(text));
  switch (wire.type) {
    case "session.open":
      return {
        type: wire.type,
        sessionId: parseField(wire.sessionId),
        adminToken: wire.adminToken,
      } satisfies SessionOpen;
    case "session.ready":
      return { type: wire.type, sessionId: parseField(wire.sessionId) } satisfies SessionReady;
    case "claim.request":
      return {
        type: wire.type,
        sessionId: parseField(wire.sessionId),
        eventId: parseField(wire.eventId),
        qrNonce: parseField(wire.qrNonce),
        commitment: parseField(wire.commitment),
        requestId: wire.requestId,
      } satisfies ClaimRequest;
    case "claim.response": {
      const response = {
        type: wire.type,
        requestId: wire.requestId,
        credential: credentialFromWire(wire.credential as WireCredential),
      } satisfies ClaimResponse;
      requireMetadataHash(response.credential.metadata, response.credential.event);
      return response;
    }
    case "relay.error":
      return {
        type: wire.type,
        code: wire.code,
        ...(wire.requestId === undefined ? {} : { requestId: wire.requestId }),
      } satisfies RelayError;
  }
}

export function encodeVerifierRequest(request: VerifierRequest): string {
  return canonicalJson(verifierRequestWireSchema.parse(toJsonValue(request)));
}

export function decodeVerifierRequest(text: string): VerifierRequest {
  const wire = verifierRequestWireSchema.parse(parseJson(text)) as WireVerifierRequest;
  return {
    protocolVersion: wire.protocolVersion,
    circuitVersion: wire.circuitVersion,
    event: eventFromWire(wire.event),
    eventId: parseField(wire.eventId),
    minimumAssuranceLevel: parseField(wire.minimumAssuranceLevel),
    verifierDomainOrChainId: parseField(wire.verifierDomainOrChainId),
    verifierId: parseField(wire.verifierId),
    actionId: parseField(wire.actionId),
    recipient: parseField(wire.recipient),
    useContext: parseField(wire.useContext),
    expiresAt: parseField(wire.expiresAt),
    actionLabel: wire.actionLabel,
  };
}

export function encodeProofPackage(proofPackage: ProofPackage): string {
  return canonicalJson(proofPackageWireSchema.parse(toJsonValue(proofPackage)));
}

export function decodeProofPackage(text: string): ProofPackage {
  const wire = proofPackageWireSchema.parse(parseJson(text));
  return {
    protocolVersion: wire.protocolVersion,
    circuitVersion: wire.circuitVersion,
    proof: wire.proof,
    publicSignals: wire.publicSignals,
    eventId: parseField(wire.eventId),
    useContext: parseField(wire.useContext),
  };
}
