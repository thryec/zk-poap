# zk-poap

`zk-poap` is an open protocol for private event-attendance credentials.

An organizer creates an event key and displays a rotating QR code. An attendee opens the QR link, receives a credential signed by the organizer, and later proves possession of that credential without revealing their secret or the credential itself.

## Current status

The project is in Milestone 1: the cryptographic core. There is no production release yet.

M1 will deliver:

- canonical protocol types and field encodings;
- event keys, Poseidon hashes, signatures, and stable test vectors;
- a tested Circom attendance circuit;
- development Groth16 proving artifacts; and
- a command-line proof that verifies end to end.

The [MVP design](docs/superpowers/specs/2026-08-05-proof-of-participation-design.md) defines the trust model. The [implementation plan](docs/superpowers/plans/2026-08-05-proof-of-participation-mvp.md) lists the full build order and release gates.

## What the MVP proves

The MVP proves that the attendee holds a valid credential issued by an event key after access to a live rotating QR code.

It does not prove physical location. A person can forward a live QR code. Verifiers must treat the first assurance level as `OPEN_ROTATING_QR`, not as GPS or device-attested presence.

## Proof stack

- Circom defines and compiles the circuit.
- Groth16 creates and verifies proofs over BN254.
- The project reuses a checked Powers of Tau phase-1 transcript.
- All events share one reviewed circuit and proving key for each circuit version.
- Production circuit releases require a circuit-specific phase-2 ceremony.

Event organizers do not run their own trusted setup.

## Repository policy

- Keep attendee secrets and proof witnesses off servers and logs.
- Pin circuit and dependency versions.
- Add negative tests for every circuit constraint family.
- Do not present QR access as strong proof of location.
- Do not commit `.ptau`, `.zkey`, witness, proof, secret, or local environment files.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Please report security issues through the private process in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
