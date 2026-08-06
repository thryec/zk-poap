import { z } from "zod";
import { CIRCUIT_VERSION, PROTOCOL_VERSION } from "./constants.js";
import { parseField } from "./field.js";
import { RELAY_ERROR_CODES } from "./types.js";

const UINT64_MAX = (1n << 64n) - 1n;

export const fieldSchema = z.string().superRefine((value, context) => {
  try {
    parseField(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid field",
    });
  }
});

export const timestampSchema = fieldSchema.superRefine((value, context) => {
  if (/^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) > UINT64_MAX) {
    context.addIssue({ code: "custom", message: "Timestamp exceeds uint64" });
  }
});

export const assuranceSchema = fieldSchema.superRefine((value, context) => {
  if (/^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) > 255n) {
    context.addIssue({ code: "custom", message: "Assurance level exceeds uint8" });
  }
});

export const eventMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2_000).optional(),
    locationLabel: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const babyJubSignatureWireSchema = z
  .object({
    r8x: fieldSchema,
    r8y: fieldSchema,
    s: fieldSchema,
  })
  .strict();

export const eventRecordWireSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    circuitVersion: z.literal(CIRCUIT_VERSION),
    pkEventX: fieldSchema,
    pkEventY: fieldSchema,
    metadataHash: fieldSchema,
    eventStart: timestampSchema,
    eventEnd: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const isCanonical = /^(0|[1-9][0-9]*)$/;
    if (
      isCanonical.test(value.eventStart) &&
      isCanonical.test(value.eventEnd) &&
      BigInt(value.eventEnd) <= BigInt(value.eventStart)
    ) {
      context.addIssue({ code: "custom", message: "Event end must be after event start" });
    }
  });

export function isSecureRelayUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}

export const relayUrlSchema = z
  .string()
  .url()
  .refine(isSecureRelayUrl, "Expected a secure relay URL");

export const qrClaimWireSchema = z
  .object({
    metadata: eventMetadataSchema,
    event: eventRecordWireSchema,
    eventId: fieldSchema,
    relayUrl: relayUrlSchema,
    sessionId: fieldSchema,
    qrNonce: fieldSchema,
    expiresAt: timestampSchema,
    signature: babyJubSignatureWireSchema,
  })
  .strict();

export const credentialWireSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    circuitVersion: z.literal(CIRCUIT_VERSION),
    metadata: eventMetadataSchema,
    event: eventRecordWireSchema,
    eventId: fieldSchema,
    issuedAt: timestampSchema,
    credentialId: fieldSchema,
    assuranceLevel: assuranceSchema,
    signature: babyJubSignatureWireSchema,
  })
  .strict();

const requestIdSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const claimRequestWireSchema = z
  .object({
    type: z.literal("claim.request"),
    sessionId: fieldSchema,
    eventId: fieldSchema,
    qrNonce: fieldSchema,
    commitment: fieldSchema,
    requestId: requestIdSchema,
  })
  .strict();

export const sessionOpenWireSchema = z
  .object({
    type: z.literal("session.open"),
    sessionId: fieldSchema,
    adminToken: z
      .string()
      .length(43)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();

export const sessionReadyWireSchema = z
  .object({
    type: z.literal("session.ready"),
    sessionId: fieldSchema,
  })
  .strict();

export const claimResponseWireSchema = z
  .object({
    type: z.literal("claim.response"),
    requestId: requestIdSchema,
    credential: credentialWireSchema,
  })
  .strict();

export const relayErrorWireSchema = z
  .object({
    type: z.literal("relay.error"),
    code: z.enum(RELAY_ERROR_CODES),
    requestId: requestIdSchema.optional(),
  })
  .strict();

export const relayMessageWireSchema = z.discriminatedUnion("type", [
  sessionOpenWireSchema,
  sessionReadyWireSchema,
  claimRequestWireSchema,
  claimResponseWireSchema,
  relayErrorWireSchema,
]);

export const verifierRequestWireSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    circuitVersion: z.literal(CIRCUIT_VERSION),
    event: eventRecordWireSchema,
    eventId: fieldSchema,
    minimumAssuranceLevel: assuranceSchema,
    verifierDomainOrChainId: fieldSchema,
    verifierId: fieldSchema,
    actionId: fieldSchema,
    recipient: fieldSchema,
    useContext: fieldSchema,
    expiresAt: timestampSchema,
    actionLabel: z.string().trim().min(1).max(200),
  })
  .strict();

const proofCoordinateSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);

export const groth16ProofWireSchema = z
  .object({
    pi_a: z.tuple([proofCoordinateSchema, proofCoordinateSchema, proofCoordinateSchema]),
    pi_b: z.tuple([
      z.tuple([proofCoordinateSchema, proofCoordinateSchema]),
      z.tuple([proofCoordinateSchema, proofCoordinateSchema]),
      z.tuple([proofCoordinateSchema, proofCoordinateSchema]),
    ]),
    pi_c: z.tuple([proofCoordinateSchema, proofCoordinateSchema, proofCoordinateSchema]),
    protocol: z.literal("groth16"),
    curve: z.literal("bn128"),
  })
  .strict();

export const publicSignalsWireSchema = z.tuple([
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
  fieldSchema,
]);

export const proofPackageWireSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    circuitVersion: z.literal(CIRCUIT_VERSION),
    proof: groth16ProofWireSchema,
    publicSignals: publicSignalsWireSchema,
    eventId: fieldSchema,
    useContext: fieldSchema,
  })
  .strict();
