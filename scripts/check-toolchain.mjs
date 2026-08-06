import { execFileSync } from "node:child_process";

const expected = {
  nodeMajor: 24,
  pnpm: "11.20.0",
  circom: "2.2.3",
};

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== expected.nodeMajor) {
  throw new Error(`Expected Node 24.x, got ${process.versions.node}`);
}

const pnpmVersion = execFileSync("pnpm", ["--version"], {
  encoding: "utf8",
}).trim();
if (pnpmVersion !== expected.pnpm) {
  throw new Error(`Expected pnpm ${expected.pnpm}, got ${pnpmVersion}`);
}

const circomVersion = execFileSync("circom", ["--version"], {
  encoding: "utf8",
}).trim();
if (!circomVersion.includes(expected.circom)) {
  throw new Error(`Expected Circom ${expected.circom}, got ${circomVersion}`);
}

console.log(`Toolchain OK: Node ${process.versions.node}, pnpm ${pnpmVersion}, ${circomVersion}`);
