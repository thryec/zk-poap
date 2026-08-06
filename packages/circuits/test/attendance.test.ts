import { resolve } from "node:path";
import { type CircuitTester, wasm as wasmTester } from "circom_tester";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type CircuitInputV1,
  signedCircuitInput,
  validCircuitInputFromFixture,
} from "./helpers.js";

describe("AttendanceCredentialV1", () => {
  let circuit: CircuitTester;

  beforeAll(async () => {
    circuit = await wasmTester(resolve("circuits/attendance.circom"), {
      include: [resolve("node_modules")],
    });
  }, 120_000);

  it("accepts the reviewed credential and emits its event ID and nullifier", async () => {
    const reviewed = await validCircuitInputFromFixture();
    const witness = await circuit.calculateWitness(reviewed.input, true);

    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, {
      eventId: reviewed.expectedEventId,
      nullifier: reviewed.expectedNullifier,
    });
    expect(witness.length).toBeGreaterThan(1);
  }, 120_000);

  it.each([
    ["event public key x", "pkEventX", 1n],
    ["event public key y", "pkEventY", 1n],
    ["metadata hash", "metadataHash", 1n],
    ["event start", "eventStart", 1n],
    ["event end", "eventEnd", -1n],
    ["minimum assurance", "minimumAssuranceLevel", 1n],
    ["master secret", "masterSecret", 1n],
    ["issue time", "issuedAt", 1n],
    ["credential ID", "credentialId", 1n],
    ["assurance level", "assuranceLevel", 1n],
    ["signature R8 x", "sigR8x", 1n],
    ["signature R8 y", "sigR8y", 1n],
    ["signature S", "sigS", 1n],
  ] satisfies ReadonlyArray<readonly [string, keyof CircuitInputV1, bigint]>)(
    "rejects an altered %s",
    async (_name, field, difference) => {
      const reviewed = await validCircuitInputFromFixture();
      const original = reviewed.input[field];
      if (original === undefined) throw new Error(`Missing circuit input ${field}`);
      reviewed.input[field] = (BigInt(original) + difference).toString();
      await expect(circuit.calculateWitness(reviewed.input, true)).rejects.toThrow();
    },
  );

  it("changes only the nullifier when the public verifier context changes", async () => {
    const reviewed = await validCircuitInputFromFixture();
    const changed = await signedCircuitInput({
      useContext: (BigInt(reviewed.input.useContext) + 1n).toString(),
    });
    const witness = await circuit.calculateWitness(changed.input, true);

    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, {
      eventId: changed.expectedEventId,
      nullifier: changed.expectedNullifier,
    });
    expect(changed.expectedNullifier).not.toBe(reviewed.expectedNullifier);
  });

  it.each([
    ["issue time equal to start", { issuedAt: "1800000000" }],
    ["issue time equal to end", { issuedAt: "1800003600" }],
    ["maximum uint8 assurance", { assuranceLevel: "255" }],
  ] satisfies ReadonlyArray<readonly [string, Partial<CircuitInputV1>]>)(
    "accepts %s",
    async (_name, overrides) => {
      const reviewed = await signedCircuitInput(overrides);
      const witness = await circuit.calculateWitness(reviewed.input, true);
      await circuit.checkConstraints(witness);
      await circuit.assertOut(witness, {
        eventId: reviewed.expectedEventId,
        nullifier: reviewed.expectedNullifier,
      });
    },
  );

  it.each([
    ["one second before the event", { issuedAt: "1799999999" }],
    ["one second after the event", { issuedAt: "1800003601" }],
    ["an assurance level of 256", { assuranceLevel: "256" }],
    [
      "a timestamp at 2^64",
      {
        eventStart: "0",
        eventEnd: ((1n << 64n) - 1n).toString(),
        issuedAt: (1n << 64n).toString(),
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Partial<CircuitInputV1>]>)(
    "rejects %s",
    async (_name, overrides) => {
      const reviewed = await signedCircuitInput(overrides);
      await expect(circuit.calculateWitness(reviewed.input, true)).rejects.toThrow();
    },
  );

  it("rejects a zero master secret", async () => {
    const reviewed = await validCircuitInputFromFixture();
    reviewed.input.masterSecret = "0";
    await expect(circuit.calculateWitness(reviewed.input, true)).rejects.toThrow();
  });
});
