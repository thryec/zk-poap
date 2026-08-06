import { sha256 } from "@noble/hashes/sha2.js";
import canonicalize from "canonicalize";
import { FIELD_MODULUS } from "./constants.js";
import { eventMetadataSchema, relayUrlSchema } from "./schemas.js";
import type { EventMetadata } from "./types.js";

function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) throw new TypeError("Value cannot be encoded as canonical JSON");
  return result;
}

function bytesToField(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value % FIELD_MODULUS;
}

function hashUtf8ToField(value: string): bigint {
  return bytesToField(sha256(new TextEncoder().encode(value)));
}

export function hashMetadata(metadata: EventMetadata): bigint {
  return hashUtf8ToField(canonicalJson(eventMetadataSchema.parse(metadata)));
}

export function hashRelayUrl(relayUrl: string): bigint {
  return hashUtf8ToField(relayUrlSchema.parse(relayUrl));
}
