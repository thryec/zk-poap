# zk-poap

`zk-poap` implements private proofs of event participation with Circom and Groth16. An
organizer signs an attendance credential. Its holder can prove that the credential is valid
without revealing their identity, attendee secret, or private credential fields.

## Protocol

The proof checks that:

- the event organizer signed the credential;
- the credential belongs to the claimed event;
- its issue time falls within the event window;
- it meets the required assurance level; and
- its nullifier matches the event and requested use.

Attendee commitments differ between events. Nullifiers differ between uses.

Public signals, in order:

```text
eventId
nullifier
pkEventX
pkEventY
metadataHash
eventStart
eventEnd
minimumAssuranceLevel
useContext
```

The private witness contains the attendee secret, credential ID, issue time, assurance level,
and organizer signature.

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 24.x |
| pnpm | 11.20.0 |
| Circom | 2.2.3 |

## Setup

```sh
git clone https://github.com/thryec/zk-poap.git
cd zk-poap
nvm use
corepack enable
corepack prepare pnpm@11.20.0 --activate
cargo install --locked --git https://github.com/iden3/circom.git --tag v2.2.3 circom
pnpm install --frozen-lockfile
```

Skip the Cargo command if Circom 2.2.3 is already installed.

## Demo

```sh
pnpm demo
```

The demo:

1. checks the protocol and circuit constants;
2. compiles the attendance circuit;
3. downloads and checks `powersOfTau28_hez_final_16.ptau`;
4. builds a development proving key and artifact manifest;
5. creates an event and signed attendance credential;
6. generates and verifies a Groth16 proof;
7. checks that a changed event ID fails verification; and
8. prints the public signals.

Example output:

```json
{
  "credentialIssued": true,
  "proofVerified": true,
  "tamperRejected": true,
  "publicSignals": {
    "eventId": "<field element>",
    "nullifier": "<field element>",
    "pkEventX": "<field element>",
    "pkEventY": "<field element>",
    "metadataHash": "<field element>",
    "eventStart": "<unix timestamp>",
    "eventEnd": "<unix timestamp>",
    "minimumAssuranceLevel": "1",
    "useContext": "<field element>"
  }
}
```

The Powers of Tau file is cached under `.cache/ptau/` and checked before each use.

## Layout

```text
.
├── packages/
│   ├── protocol/          Protocol types, hashes, signatures, wire formats, and tests
│   └── circuits/
│       ├── circuits/      Circom source
│       ├── scripts/       Build and demo scripts
│       ├── src/           Proof helpers and demo flow
│       ├── test/          Circuit and Groth16 tests
│       └── build/v1/      Development artifacts
├── scripts/               Tool checks
└── .github/workflows/     CI
```

`packages/protocol/test/fixtures/v1.json` is the shared protocol and circuit test vector.

## Development artifacts

`packages/circuits/build/v1/` contains the compiled circuit, witness generator, proving key,
verification key, and artifact manifest.

`attendance_dev.zkey` uses a fixed public phase-2 contribution. Anyone can forge proofs with
it. Production use requires a separate phase-2 ceremony and new artifact hashes.

## Limits

- Verifiers choose which organizer keys to trust. An organizer can issue any number of
  credentials for its own event.
- A rotating QR code proves access to the code, not physical location. It can be forwarded
  while valid. The protocol makes no GPS, device, or identity claim.
