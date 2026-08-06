import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ptauBlake2b512, ptauPath, ptauUrl, ptauVerificationMarkerPath } from "./config.mjs";
import { run } from "./run.mjs";

async function fileHash(path) {
  const hash = createHash("blake2b512");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function isValidCachedFile() {
  try {
    return (await fileHash(ptauPath)) === ptauBlake2b512;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

async function hasVerificationMarker() {
  try {
    return (await readFile(ptauVerificationMarkerPath, "utf8")) === `${ptauBlake2b512}\n`;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

await mkdir(dirname(ptauPath), { recursive: true });

if (!(await isValidCachedFile())) {
  const temporaryPath = `${ptauPath}.download`;
  await rm(temporaryPath, { force: true });
  await rm(ptauPath, { force: true });
  await rm(ptauVerificationMarkerPath, { force: true });

  console.log(`Downloading Powers of Tau from ${ptauUrl}`);
  const response = await fetch(ptauUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Powers of Tau download failed with HTTP ${String(response.status)}`);
  }
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(temporaryPath, { flags: "wx" }),
  );

  const hash = await fileHash(temporaryPath);
  if (hash !== ptauBlake2b512) {
    await rm(temporaryPath, { force: true });
    throw new Error(`Powers of Tau hash mismatch: received ${hash}`);
  }
  await rename(temporaryPath, ptauPath);
} else {
  console.log("Using the cached Powers of Tau file with the expected BLAKE2b-512 hash.");
}

if (await hasVerificationMarker()) {
  console.log("Using the hash-bound SnarkJS transcript verification marker.");
} else {
  await run("snarkjs", ["powersoftau", "verify", ptauPath]);
  await writeFile(ptauVerificationMarkerPath, `${ptauBlake2b512}\n`);
}
console.log(`Verified Powers of Tau BLAKE2b-512: ${ptauBlake2b512}`);
