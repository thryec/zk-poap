import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FIELD_MODULUS, mapPublicSignals } from "@pop/protocol";
import { groth16 } from "snarkjs";
import { expect, it } from "vitest";
import { proveReviewedVector, verifyAttendanceProof } from "../src/prove-reviewed-vector.js";

interface ReviewedVector {
  eventId: string;
  nullifier: string;
}

it("proves and verifies the reviewed v1 credential", async () => {
  const fixturePath = fileURLToPath(
    new URL("../../protocol/test/fixtures/v1.json", import.meta.url),
  );
  const reviewed = JSON.parse(await readFile(fixturePath, "utf8")) as ReviewedVector;
  const { proof, publicSignals, verificationKey } = await proveReviewedVector();
  const signals = mapPublicSignals(publicSignals);

  expect(signals.eventId).toBe(BigInt(reviewed.eventId));
  expect(signals.nullifier).toBe(BigInt(reviewed.nullifier));
  expect(await groth16.verify(verificationKey, publicSignals, proof)).toBe(true);

  const changedSignals = [...publicSignals];
  changedSignals[0] = ((BigInt(changedSignals[0] as string) + 1n) % FIELD_MODULUS).toString();
  expect(await verifyAttendanceProof(verificationKey, changedSignals, proof)).toBe(false);

  const changedProof = structuredClone(proof);
  changedProof.pi_a[0] = (BigInt(changedProof.pi_a[0] as string) + 1n).toString();
  expect(await verifyAttendanceProof(verificationKey, publicSignals, changedProof)).toBe(false);
}, 300_000);
