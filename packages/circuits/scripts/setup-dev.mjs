import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { zKey } from "snarkjs";
import {
  developmentBeaconHex,
  developmentBeaconIterations,
  developmentWarning,
  devZkeyPath,
  ptauPath,
  r1csPath,
  verificationKeyPath,
} from "./config.mjs";

const initialZkeyPath = `${devZkeyPath}.initial`;

if (basename(devZkeyPath).includes("final")) {
  throw new Error("The development setup refuses to write a file named final.zkey.");
}

console.error(
  `\u001b[31m${developmentWarning}: never use this proving key in production.\u001b[0m`,
);
await mkdir(dirname(devZkeyPath), { recursive: true });
await rm(initialZkeyPath, { force: true });
await rm(devZkeyPath, { force: true });
await rm(verificationKeyPath, { force: true });

try {
  await zKey.newZKey(r1csPath, ptauPath, initialZkeyPath);
  await zKey.beacon(
    initialZkeyPath,
    devZkeyPath,
    developmentWarning,
    developmentBeaconHex,
    developmentBeaconIterations,
  );

  if (!(await zKey.verifyFromR1cs(r1csPath, ptauPath, devZkeyPath))) {
    throw new Error("The development proving key failed zkey verification.");
  }

  const verificationKey = await zKey.exportVerificationKey(devZkeyPath);
  await writeFile(verificationKeyPath, `${JSON.stringify(verificationKey, null, 2)}\n`);
} finally {
  await rm(initialZkeyPath, { force: true });
}

console.log("Created and verified the development-only Groth16 proving key.");
process.exit(0);
