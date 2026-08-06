import { describe, expect, it } from "vitest";
import { createProtocolCrypto, hashMetadata, hashRelayUrl } from "../src/index.js";

const TEST_EVENT_PRIVATE_KEY = Uint8Array.from({ length: 32 }, (_, index) => index);

describe("canonical SHA-256 hashes", () => {
  it("hashes RFC 8785 metadata independent of property insertion order", () => {
    const first = {
      name: "ZK Meetup",
      description: "Protocol night",
      locationLabel: "Main Hall",
    };
    const second = {
      locationLabel: "Main Hall",
      name: "ZK Meetup",
      description: "Protocol night",
    };

    expect(hashMetadata(first)).toBe(
      13673578780227181500064122446324672355386459273141319387210590002720860252334n,
    );
    expect(hashMetadata(second)).toBe(hashMetadata(first));
  });

  it("hashes the exact UTF-8 relay URL", () => {
    expect(hashRelayUrl("https://relay.example/ws")).toBe(
      17365825353160099266758611319760800989377489851527256169431169230425099482663n,
    );
    expect(hashRelayUrl("https://relay.example/ws/")).not.toBe(
      hashRelayUrl("https://relay.example/ws"),
    );
  });
});

describe("event-specific identity", () => {
  it("derives a different commitment for each event", async () => {
    const crypto = await createProtocolCrypto();
    const masterSecret = 123456789n;

    expect(crypto.deriveCommitment(masterSecret, 11n)).not.toBe(
      crypto.deriveCommitment(masterSecret, 12n),
    );
  });

  it("rejects a zero master secret", async () => {
    const crypto = await createProtocolCrypto();
    expect(() => crypto.deriveCommitment(0n, 11n)).toThrow("nonzero master secret");
  });

  it("binds a stable nullifier to both event and verifier context", async () => {
    const crypto = await createProtocolCrypto();
    const masterSecret = 123456789n;
    const first = crypto.computeNullifier(masterSecret, 11n, 21n);

    expect(crypto.computeNullifier(masterSecret, 11n, 21n)).toBe(first);
    expect(crypto.computeNullifier(masterSecret, 12n, 21n)).not.toBe(first);
    expect(crypto.computeNullifier(masterSecret, 11n, 22n)).not.toBe(first);
  });
});

describe("Baby Jubjub EdDSA Poseidon signatures", () => {
  it("verifies the signed field and rejects an altered message", async () => {
    const crypto = await createProtocolCrypto();
    const publicKey = crypto.publicKey(TEST_EVENT_PRIVATE_KEY);
    const signature = crypto.signField(TEST_EVENT_PRIVATE_KEY, 99n);

    expect(crypto.verifyFieldSignature(publicKey, 99n, signature)).toBe(true);
    expect(crypto.verifyFieldSignature(publicKey, 100n, signature)).toBe(false);
  });

  it("requires an exact 32-byte private key", async () => {
    const crypto = await createProtocolCrypto();
    expect(() => crypto.publicKey(new Uint8Array(31))).toThrow("32-byte private key");
  });
});
