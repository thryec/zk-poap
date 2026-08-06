import { parseField } from "./field.js";

export const PUBLIC_SIGNAL_ORDER = [
  "eventId",
  "nullifier",
  "pkEventX",
  "pkEventY",
  "metadataHash",
  "eventStart",
  "eventEnd",
  "minimumAssuranceLevel",
  "useContext",
] as const;

export type AttendancePublicSignals = Record<(typeof PUBLIC_SIGNAL_ORDER)[number], bigint>;

export function mapPublicSignals(signals: readonly string[]): AttendancePublicSignals {
  if (signals.length !== PUBLIC_SIGNAL_ORDER.length) {
    throw new TypeError(`Expected exactly ${PUBLIC_SIGNAL_ORDER.length} public signals`);
  }

  const [
    eventId,
    nullifier,
    pkEventX,
    pkEventY,
    metadataHash,
    eventStart,
    eventEnd,
    minimumAssuranceLevel,
    useContext,
  ] = signals as [string, string, string, string, string, string, string, string, string];

  return {
    eventId: parseField(eventId),
    nullifier: parseField(nullifier),
    pkEventX: parseField(pkEventX),
    pkEventY: parseField(pkEventY),
    metadataHash: parseField(metadataHash),
    eventStart: parseField(eventStart),
    eventEnd: parseField(eventEnd),
    minimumAssuranceLevel: parseField(minimumAssuranceLevel),
    useContext: parseField(useContext),
  };
}
