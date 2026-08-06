# zk-poap

`zk-poap` is an open protocol and Circom circuit for private proofs of event participation.
An organizer signs an attendance credential. The attendee can later prove that the credential
is valid without revealing their identity, attendee secret, or private credential fields.

This repository contains the TypeScript protocol library, the attendance circuit, tests,
development proving artifacts, and an end-to-end command-line demo. It does not yet contain
an organizer app, attendee wallet, verifier app, or production proving key.

## Protocol

The attendance proof shows that:

- an organizer signed the credential with the event key;
- the credential belongs to the claimed event;
- the issue time falls within the event window;
- the credential meets the verifier's required assurance level; and
- the nullifier belongs to the attendee, event, and requested use.

Each event gets a separate attendee commitment. This prevents two organizers from linking an
attendee by comparing commitments. A verifier can use the context-bound nullifier to reject a
second use for the same action without creating a global attendee ID.

The proof exposes these public signals in a fixed order:

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

The organizer key, event data, and proof context are public. The attendee secret, credential
ID, issue time, assurance level, and signature remain private.

## Requirements

Use the pinned versions below. The build checks them before it runs.

| Tool | Version |
| --- | --- |
| Node.js | 24.x |
| pnpm | 11.20.0 |
| Circom | 2.2.3 |

Rust and Cargo are only needed if you install Circom from source.

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

You can skip the Cargo command if `circom --version` already reports `2.2.3`.

## Run the full demo

```sh
pnpm demo
```

On its first run, the demo:

1. checks that the TypeScript and Circom constants match;
2. compiles the attendance circuit;
3. downloads the pinned `powersOfTau28_hez_final_16.ptau` file;
4. checks the Powers of Tau file and SnarkJS transcript;
5. creates and checks a deterministic development-only Groth16 proving key;
6. writes a manifest with artifact sizes and SHA-256 hashes;
7. creates a local event key, event, attendee secret, and signed credential;
8. generates and verifies an attendance proof;
9. changes the public event ID and checks that verification fails; and
10. prints the public result without logging the private witness.

The last output has this shape. Field elements vary on each run.

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

The Powers of Tau download is cached under `.cache/ptau/`. Later runs still check the pinned
hash before using it.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm check` | Check tool versions, lint, type-check, test, and build |
| `pnpm demo` | Build the development artifacts and run the full proof flow |
| `pnpm test` | Run the protocol and circuit tests |
| `pnpm lint` | Check source and documentation formatting |
| `pnpm typecheck` | Type-check all workspace packages |
| `pnpm build` | Check that all packages build |
| `pnpm --filter @pop/circuits artifacts:dev` | Rebuild all development proving artifacts |
| `pnpm --filter @pop/circuits prove:smoke` | Generate and verify a proof with existing artifacts |

Run `pnpm check` before opening a pull request. CI runs the same checks with the pinned tools.

## Repository layout

```text
.
├── packages/
│   ├── protocol/          TypeScript types, hashes, signatures, wire formats, and tests
│   └── circuits/
│       ├── circuits/      Circom source
│       ├── scripts/       Compile, setup, manifest, and demo scripts
│       ├── src/           Proof helpers and the end-to-end demo flow
│       ├── test/          Circuit, signal, and Groth16 tests
│       └── build/v1/      Reproducible development artifacts
├── scripts/               Repository tool checks
└── .github/workflows/     CI
```

The protocol test vector lives at
`packages/protocol/test/fixtures/v1.json`. Circuit tests use it to check that the TypeScript
code and Circom circuit agree on hashes, signatures, inputs, and public signals.

## Development artifacts

`packages/circuits/build/v1/` contains:

- `attendance.r1cs`: compiled constraint system;
- `attendance_js/attendance.wasm`: browser and Node.js witness generator;
- `attendance_dev.zkey`: development proving key;
- `verification_key.dev.json`: matching verification key; and
- `manifest.dev.json`: tool versions, constraint count, signal order, and artifact hashes.

The repository creates the phase-2 development key from a fixed public beacon. Anyone can
reproduce its secret contribution, so anyone can forge proofs made with this key. Never use
`attendance_dev.zkey` for real credentials. A production release needs a separate phase-2
ceremony and published artifact hashes.

## Trust and limits

The verifier decides which organizer keys to trust. A permissionless organizer can issue any
number of credentials for its own event.

A rotating QR code proves access to the code, not physical location. Someone can forward the
code while it remains valid. The base protocol makes no GPS, device, or identity claim.

This code has not had a production security audit. Do not use it to protect money, access, or
other high-value rights.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Report security issues through
the private process in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
