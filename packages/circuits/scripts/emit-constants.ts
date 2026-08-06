import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ASSURANCE_OPEN_ROTATING_QR, CIRCUIT_VERSION, DOMAIN } from "@pop/protocol";

const expected = `pragma circom 2.2.3;

function circuitV1() {
    return ${CIRCUIT_VERSION};
}

function assuranceOpenRotatingQr() {
    return ${ASSURANCE_OPEN_ROTATING_QR};
}

function domainEventV1() {
    return ${DOMAIN.event};
}

function domainUserEventV1() {
    return ${DOMAIN.userEvent};
}

function domainCommitmentV1() {
    return ${DOMAIN.commitment};
}

function domainCredentialV1() {
    return ${DOMAIN.credential};
}

function domainNullifierV1() {
    return ${DOMAIN.nullifier};
}
`;

if (process.argv.includes("--check")) {
  const actual = await readFile(resolve("circuits/generated/constants.circom"), "utf8");
  if (actual !== expected) throw new Error("Generated Circom constants are stale");
  console.log("Circom constants match protocol v1");
} else {
  process.stdout.write(expected);
}
