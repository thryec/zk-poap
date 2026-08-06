import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { r1cs } from "snarkjs";
import { buildDir, circuitSource, maxConstraints, packageDir, r1csPath } from "./config.mjs";
import { run } from "./run.mjs";

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });

await run("circom", [
  circuitSource,
  "--r1cs",
  "--wasm",
  "--sym",
  "--O2",
  "--output",
  buildDir,
  "-l",
  join(packageDir, "node_modules"),
]);

const info = await r1cs.info(r1csPath);
const constraintCount = info.nConstraints;
await info.curve.terminate();

if (constraintCount > maxConstraints) {
  throw new Error(
    `Circuit has ${String(constraintCount)} constraints, above the Powers of Tau capacity of ${String(maxConstraints)}`,
  );
}

console.log(
  `Compiled attendance v1 with ${String(constraintCount)} constraints (capacity ${String(maxConstraints)}).`,
);
