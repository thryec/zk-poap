import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_SIGNAL_ORDER } from "@pop/protocol";
import { expect, it } from "vitest";
import {
  checkTamperedExampleProof,
  createExampleCredential,
  generateExampleProof,
  readExamplePublicSignals,
  verifyExampleProof,
} from "../src/example-steps.js";

interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stoppedAfterOutput: boolean;
}

const packageDir = fileURLToPath(new URL("../", import.meta.url));

function runProofCommand(): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/example-step.mjs", "prove"],
      {
        cwd: packageDir,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let stoppedAfterOutput = false;
    let outputTimer: NodeJS.Timeout | undefined;
    const timeout = setTimeout(() => child.kill("SIGTERM"), 60_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.includes('"proofGenerated": true') && outputTimer === undefined) {
        outputTimer = setTimeout(() => {
          stoppedAfterOutput = true;
          child.kill("SIGTERM");
        }, 1_000);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (outputTimer !== undefined) clearTimeout(outputTimer);
      resolve({ code, signal, stdout, stderr, stoppedAfterOutput });
    });
  });
}

it("runs the attendance proof as separate persisted steps", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "zk-poap-example-"));

  try {
    const credential = await createExampleCredential(stateDir);
    expect(credential.credentialCreated).toBe(true);
    expect(credential.eventId).toMatch(/^[0-9]+$/u);

    const privateState = await readFile(credential.statePath, "utf8");
    expect(privateState).not.toContain("privateKey");
    expect((await stat(credential.statePath)).mode & 0o777).toBe(0o600);

    const generated = await generateExampleProof(stateDir);
    expect(generated.proofGenerated).toBe(true);

    const proofPackage = await readFile(generated.proofPath, "utf8");
    for (const privateField of [
      "masterSecret",
      "credentialId",
      "issuedAt",
      "assuranceLevel",
      "signature",
    ]) {
      expect(proofPackage).not.toContain(privateField);
    }

    await expect(verifyExampleProof(stateDir)).resolves.toEqual({ proofVerified: true });
    await expect(checkTamperedExampleProof(stateDir)).resolves.toEqual({ tamperRejected: true });

    const publicSignals = await readExamplePublicSignals(stateDir);
    expect(Object.keys(publicSignals)).toEqual(PUBLIC_SIGNAL_ORDER);
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
}, 300_000);

it("exits after the proof command writes its result", async () => {
  const credential = await createExampleCredential();
  try {
    const result = await runProofCommand();
    expect(result).toMatchObject({ code: 0, signal: null, stoppedAfterOutput: false, stderr: "" });
    expect(result.stdout).toContain('"proofGenerated": true');
  } finally {
    await rm(dirname(credential.statePath), { recursive: true, force: true });
  }
}, 300_000);
