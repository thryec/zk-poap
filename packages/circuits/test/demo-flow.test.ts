import { PUBLIC_SIGNAL_ORDER } from "@pop/protocol";
import { expect, it } from "vitest";
import { runDemoFlow } from "../src/demo-flow.js";

it("issues a credential, proves it, verifies it, and rejects tampering", async () => {
  const result = await runDemoFlow();

  expect(result.credentialIssued).toBe(true);
  expect(result.proofVerified).toBe(true);
  expect(result.tamperRejected).toBe(true);
  expect(Object.keys(result.publicSignals)).toEqual(PUBLIC_SIGNAL_ORDER);
  expect(Object.keys(result).sort()).toEqual(
    ["credentialIssued", "proofVerified", "publicSignals", "tamperRejected"].sort(),
  );

  for (const privateField of [
    "privateKey",
    "masterSecret",
    "commitment",
    "issuedAt",
    "credentialId",
    "assuranceLevel",
    "signature",
    "proof",
  ]) {
    expect(result).not.toHaveProperty(privateField);
    expect(result.publicSignals).not.toHaveProperty(privateField);
  }
}, 300_000);
