import { mapPublicSignals, PUBLIC_SIGNAL_ORDER } from "@pop/protocol";
import { describe, expect, it } from "vitest";

describe("attendance public signals", () => {
  it("maps the Groth16 array in circuit order", () => {
    expect(mapPublicSignals(["1", "2", "3", "4", "5", "6", "7", "8", "9"])).toEqual({
      eventId: 1n,
      nullifier: 2n,
      pkEventX: 3n,
      pkEventY: 4n,
      metadataHash: 5n,
      eventStart: 6n,
      eventEnd: 7n,
      minimumAssuranceLevel: 8n,
      useContext: 9n,
    });
    expect(PUBLIC_SIGNAL_ORDER).toEqual([
      "eventId",
      "nullifier",
      "pkEventX",
      "pkEventY",
      "metadataHash",
      "eventStart",
      "eventEnd",
      "minimumAssuranceLevel",
      "useContext",
    ]);
  });

  it("rejects missing, extra, and noncanonical signals", () => {
    expect(() => mapPublicSignals(["1"])).toThrow("exactly 9");
    expect(() => mapPublicSignals(Array.from({ length: 10 }, () => "1"))).toThrow("exactly 9");
    expect(() => mapPublicSignals(["01", "2", "3", "4", "5", "6", "7", "8", "9"])).toThrow(
      "canonical field",
    );
  });
});
