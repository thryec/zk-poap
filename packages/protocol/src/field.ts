import { FIELD_MODULUS } from "./constants.js";

const CANONICAL_DECIMAL = /^(0|[1-9][0-9]*)$/;
const FIELD_BYTES = 32;

function assertField(value: bigint): void {
  if (value < 0n || value >= FIELD_MODULUS) {
    throw new RangeError("Value is outside field");
  }
}

export function parseField(value: string): bigint {
  if (!CANONICAL_DECIMAL.test(value)) {
    throw new TypeError("Expected canonical field decimal string");
  }

  const parsed = BigInt(value);
  assertField(parsed);
  return parsed;
}

export function stringifyField(value: bigint): string {
  assertField(value);
  return value.toString(10);
}

export function fieldToBytes32(value: bigint): Uint8Array {
  assertField(value);

  const result = new Uint8Array(FIELD_BYTES);
  let remaining = value;
  for (let index = FIELD_BYTES - 1; index >= 0; index -= 1) {
    result[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return result;
}

export function fieldFromBytes32(bytes: Uint8Array): bigint {
  if (bytes.length !== FIELD_BYTES) {
    throw new TypeError("Expected exactly 32 bytes");
  }

  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  assertField(value);
  return value;
}
