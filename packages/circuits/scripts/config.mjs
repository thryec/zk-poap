import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));

export const packageDir = join(scriptsDir, "..");
export const repoDir = join(packageDir, "..", "..");
export const circuitVersion = 1;
export const buildDir = join(packageDir, "build", `v${circuitVersion}`);
export const circuitSource = join(packageDir, "circuits", "attendance.circom");
export const r1csPath = join(buildDir, "attendance.r1cs");
export const symPath = join(buildDir, "attendance.sym");
export const wasmPath = join(buildDir, "attendance_js", "attendance.wasm");
export const devZkeyPath = join(buildDir, "attendance_dev.zkey");
export const verificationKeyPath = join(buildDir, "verification_key.dev.json");
export const manifestPath = join(buildDir, "manifest.dev.json");
export const ptauUrl = "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_16.ptau";
export const ptauBlake2b512 =
  "6a6277a2f74e1073601b4f9fed6e1e55226917efb0f0db8a07d98ab01df1ccf43eb0e8c3159432acd4960e2f29fe84a4198501fa54c8dad9e43297453efec125";
export const ptauPath = join(repoDir, ".cache", "ptau", "powersOfTau28_hez_final_16.ptau");
export const ptauVerificationMarkerPath = join(
  repoDir,
  ".cache",
  "ptau",
  `.verified-snarkjs-0.7.6-${ptauBlake2b512}`,
);
export const ptauPower = 16;
export const maxConstraints = 2 ** ptauPower;
export const developmentWarning = "DEVELOPMENT ONLY - FORGEABLE";
export const developmentBeaconHex =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
export const developmentBeaconIterations = 10;

export const publicSignalOrder = [
  "eventId",
  "nullifier",
  "pkEventX",
  "pkEventY",
  "metadataHash",
  "eventStart",
  "eventEnd",
  "minimumAssuranceLevel",
  "useContext",
];
