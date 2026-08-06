import { describe, expect, it } from "vitest";
import {
  type ClaimResponse,
  type Credential,
  decodeCredential,
  decodeProofPackage,
  decodeQrClaim,
  decodeRelayMessage,
  decodeVerifierRequest,
  type EventRecord,
  encodeCredential,
  encodeProofPackage,
  encodeQrClaimUrl,
  encodeVerifierRequest,
  encodeWire,
  fieldFromBytes32,
  fieldToBytes32,
  type ProofPackage,
  parseField,
  type QrClaim,
  stringifyField,
  type VerifierRequest,
} from "../src/index.js";

const EXPECTED_FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const event: EventRecord = {
  protocolVersion: 1,
  circuitVersion: 1,
  pkEventX: 11n,
  pkEventY: 12n,
  metadataHash: 13673578780227181500064122446324672355386459273141319387210590002720860252334n,
  eventStart: 1_800_000_000n,
  eventEnd: 1_800_003_600n,
};

const metadata = {
  name: "ZK Meetup",
  description: "Protocol night",
  locationLabel: "Main Hall",
};

const qrClaim: QrClaim = {
  metadata,
  event,
  eventId: 99n,
  relayUrl: "https://relay.example/ws",
  sessionId: 101n,
  qrNonce: 102n,
  expiresAt: 1_800_000_040n,
  signature: { r8x: 21n, r8y: 22n, s: 23n },
};

const credential: Credential = {
  protocolVersion: 1,
  circuitVersion: 1,
  metadata,
  event,
  eventId: 99n,
  issuedAt: 1_800_000_010n,
  credentialId: 201n,
  assuranceLevel: 1n,
  signature: { r8x: 31n, r8y: 32n, s: 33n },
};

const verifierRequest: VerifierRequest = {
  protocolVersion: 1,
  circuitVersion: 1,
  event,
  eventId: 99n,
  minimumAssuranceLevel: 1n,
  verifierDomainOrChainId: 301n,
  verifierId: 302n,
  actionId: 303n,
  recipient: 0n,
  useContext: 304n,
  expiresAt: 1_800_000_300n,
  actionLabel: "Enter private session",
};

const proofPackage: ProofPackage = {
  protocolVersion: 1,
  circuitVersion: 1,
  proof: {
    pi_a: ["1", "2", "1"],
    pi_b: [
      ["3", "4"],
      ["5", "6"],
      ["1", "0"],
    ],
    pi_c: ["7", "8", "1"],
    protocol: "groth16",
    curve: "bn128",
  },
  publicSignals: ["99", "77", "11", "12", event.metadataHash.toString(), "1", "2", "1", "304"],
  eventId: 99n,
  useContext: 304n,
};

function changeClaimFragment(
  urlText: string,
  mutate: (value: Record<string, unknown>) => void,
): string {
  const url = new URL(urlText);
  const value = JSON.parse(Buffer.from(url.hash.slice(1), "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  mutate(value);
  url.hash = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return url.toString();
}

describe("canonical field encoding", () => {
  it("round-trips canonical decimal fields", () => {
    expect(parseField(stringifyField(42n))).toBe(42n);
  });

  it.each(["", "+1", "01", "-1", " 1", "1 "])("rejects noncanonical decimal %j", (value) => {
    expect(() => parseField(value)).toThrow("canonical field");
  });

  it("rejects values outside the scalar field", () => {
    expect(() => parseField(EXPECTED_FIELD_MODULUS.toString())).toThrow("outside field");
    expect(() => stringifyField(-1n)).toThrow("outside field");
    expect(() => stringifyField(EXPECTED_FIELD_MODULUS)).toThrow("outside field");
  });
});

describe("32-byte field encoding", () => {
  it.each([0n, 1n, EXPECTED_FIELD_MODULUS - 1n])("round-trips %s", (value) => {
    expect(fieldFromBytes32(fieldToBytes32(value))).toBe(value);
  });

  it("uses unsigned big-endian byte order", () => {
    expect(Array.from(fieldToBytes32(258n).slice(29))).toEqual([0, 1, 2]);
  });

  it("rejects the wrong byte length and out-of-field bytes", () => {
    expect(() => fieldFromBytes32(new Uint8Array(31))).toThrow("32 bytes");
    expect(() => fieldFromBytes32(fieldToBytes32(EXPECTED_FIELD_MODULUS - 1n).fill(255))).toThrow(
      "outside field",
    );
  });
});

describe("strict wire messages", () => {
  it("round-trips a QR claim through a fragment URL", () => {
    const urlText = encodeQrClaimUrl("https://wallet.example", qrClaim);
    const url = new URL(urlText);

    expect(url.pathname).toBe("/claim");
    expect(url.search).toBe("");
    expect(url.hash.length).toBeGreaterThan(1);
    expect(decodeQrClaim(urlText)).toEqual(qrClaim);
  });

  it("rejects display metadata that does not match its signed hash", () => {
    const altered = changeClaimFragment(
      encodeQrClaimUrl("https://wallet.example", qrClaim),
      (value) => {
        (value.metadata as Record<string, unknown>).name = "Altered event";
      },
    );
    expect(() => decodeQrClaim(altered)).toThrow("metadata hash");
  });

  it("rejects unknown keys and noncanonical fields", () => {
    const withUnknownKey = changeClaimFragment(
      encodeQrClaimUrl("https://wallet.example", qrClaim),
      (value) => {
        value.extra = true;
      },
    );
    expect(() => decodeQrClaim(withUnknownKey)).toThrow();

    const withLeadingZero = changeClaimFragment(
      encodeQrClaimUrl("https://wallet.example", qrClaim),
      (value) => {
        value.eventId = "099";
      },
    );
    expect(() => decodeQrClaim(withLeadingZero)).toThrow();
  });

  it("allows secure relay URLs and only localhost over plain HTTP", () => {
    expect(decodeQrClaim(encodeQrClaimUrl("https://wallet.example", qrClaim)).relayUrl).toBe(
      "https://relay.example/ws",
    );
    expect(
      decodeQrClaim(
        encodeQrClaimUrl("http://localhost:5173", {
          ...qrClaim,
          relayUrl: "http://localhost:8787/ws",
        }),
      ).relayUrl,
    ).toBe("http://localhost:8787/ws");
    expect(() =>
      decodeQrClaim(
        encodeQrClaimUrl("https://wallet.example", {
          ...qrClaim,
          relayUrl: "http://relay.example/ws",
        }),
      ),
    ).toThrow("relay URL");
  });

  it("round-trips credentials and relay responses", () => {
    expect(decodeCredential(encodeCredential(credential))).toEqual(credential);

    const response: ClaimResponse = {
      type: "claim.response",
      requestId: "request_01J00000000000000000000000",
      credential,
    };
    expect(decodeRelayMessage(encodeWire(response))).toEqual(response);
  });

  it("round-trips every relay message variant", () => {
    const messages = [
      {
        type: "session.open" as const,
        sessionId: 101n,
        adminToken: "a".repeat(43),
      },
      { type: "session.ready" as const, sessionId: 101n },
      {
        type: "claim.request" as const,
        sessionId: 101n,
        eventId: 99n,
        qrNonce: 102n,
        commitment: 103n,
        requestId: "request_01J00000000000000000000000",
      },
      {
        type: "relay.error" as const,
        code: "SESSION_OFFLINE" as const,
        requestId: "request_01J00000000000000000000000",
      },
    ];

    for (const message of messages) {
      expect(decodeRelayMessage(encodeWire(message))).toEqual(message);
    }
  });

  it("round-trips verifier requests and proof packages", () => {
    expect(decodeVerifierRequest(encodeVerifierRequest(verifierRequest))).toEqual(verifierRequest);
    expect(decodeProofPackage(encodeProofPackage(proofPackage))).toEqual(proofPackage);
  });

  it("rejects invalid versions, timestamp ranges, assurance ranges, and proof signal counts", () => {
    const invalidVersion = JSON.parse(encodeVerifierRequest(verifierRequest)) as Record<
      string,
      unknown
    >;
    invalidVersion.circuitVersion = 2;
    expect(() => decodeVerifierRequest(JSON.stringify(invalidVersion))).toThrow();

    const invalidTime = JSON.parse(encodeVerifierRequest(verifierRequest)) as Record<
      string,
      unknown
    >;
    invalidTime.expiresAt = (1n << 64n).toString();
    expect(() => decodeVerifierRequest(JSON.stringify(invalidTime))).toThrow("uint64");

    const invalidAssurance = JSON.parse(encodeVerifierRequest(verifierRequest)) as Record<
      string,
      unknown
    >;
    invalidAssurance.minimumAssuranceLevel = "256";
    expect(() => decodeVerifierRequest(JSON.stringify(invalidAssurance))).toThrow("uint8");

    const malformedTime = JSON.parse(encodeVerifierRequest(verifierRequest)) as Record<
      string,
      unknown
    >;
    (malformedTime.event as Record<string, unknown>).eventStart = "not-a-timestamp";
    expect(() => decodeVerifierRequest(JSON.stringify(malformedTime))).toThrow("canonical field");

    const invalidSignals = JSON.parse(encodeProofPackage(proofPackage)) as Record<string, unknown>;
    (invalidSignals.publicSignals as unknown[]).pop();
    expect(() => decodeProofPackage(JSON.stringify(invalidSignals))).toThrow();
  });
});
