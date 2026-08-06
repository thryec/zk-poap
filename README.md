# zk-poap

`zk-poap` is an open protocol for privacy-preserving proofs of event participation.

Anyone can create an event and issue attendance credentials. Attendees can later prove that they received a valid credential without revealing their identity, secret, or credential.

## How it works

1. An organizer creates an event signing key in the browser.
2. The organizer displays a rotating QR code at the event.
3. An attendee opens the QR link and receives a signed credential bound to an event-specific secret.
4. The attendee generates a zero-knowledge proof on their device.
5. A verifier checks the proof against an event and a requested action.

The attendee does not need an account, email address, wallet address, selfie, raw GPS data, or native mobile app.

## Privacy

- Each event receives a different attendee commitment, which prevents organizers from linking the attendee across events.
- The attendee's secret, credential details, and proof witness stay on their device.
- Proofs reveal only the event, the verifier's requested context, the required assurance level, and a context-bound nullifier.
- The nullifier can prevent reuse for one action without creating a global attendee identifier.

## Trust and limits

The verifier chooses which event keys and organizers to trust. The protocol does not claim that every permissionless event is genuine, and an organizer can issue credentials for its own event at will.

A rotating QR proves access to a live event code, not physical location. Someone can forward the code while it remains valid. Stronger check-in methods can use separate assurance levels without changing what the base protocol claims.

## Technology

- Circom defines the attendance circuit.
- Groth16 produces small proofs that can be generated and checked in a browser.
- Poseidon hashes and Baby Jubjub EdDSA signatures keep credential checks efficient inside the circuit.
- A progressive web app supports organizers, attendees, and verifiers without an app-store install.

## Run the command-line demo

Install Node.js 24, pnpm 11.20.0, Circom 2.2.3, and the project packages. Then run:

```sh
pnpm demo
```

The first run downloads and verifies the pinned `powersOfTau28_hez_final_16.ptau`, compiles the circuit, and creates a forgeable development proving key. It then issues a local test credential, generates and verifies a Groth16 proof, checks that a changed public signal fails, and prints only the proof's public signals.

The generated phase-2 key is for local development only. Do not use it for real events.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Report security issues through the private process in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
