import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { r1cs } from "snarkjs";
import {
  circuitVersion,
  developmentBeaconHex,
  developmentBeaconIterations,
  developmentWarning,
  devZkeyPath,
  manifestPath,
  publicSignalOrder,
  r1csPath,
  verificationKeyPath,
  wasmPath,
} from "./config.mjs";

async function describeArtifact(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const file = await stat(path);
  return {
    filename: basename(path),
    bytes: file.size,
    sha256: hash.digest("hex"),
  };
}

const artifacts = await Promise.all(
  [r1csPath, wasmPath, devZkeyPath, verificationKeyPath].map(describeArtifact),
);
const seen = new Map();
for (const artifact of artifacts) {
  const priorHash = seen.get(artifact.filename);
  if (priorHash !== undefined && priorHash !== artifact.sha256) {
    throw new Error(`Duplicate artifact filename has different hashes: ${artifact.filename}`);
  }
  seen.set(artifact.filename, artifact.sha256);
}

const info = await r1cs.info(r1csPath);
const constraintCount = info.nConstraints;
await info.curve.terminate();
const circomVersion = execFileSync("circom", ["--version"], { encoding: "utf8" }).trim();
const manifest = {
  warning: developmentWarning,
  circuitVersion,
  circomVersion,
  constraintCount,
  publicSignalOrder,
  phase2: {
    method: "fixed public development beacon",
    beaconHex: developmentBeaconHex,
    iterationsExponent: developmentBeaconIterations,
  },
  artifacts,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifestPath}`);
