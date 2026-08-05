# Contributing to zk-poap

Thanks for helping build `zk-poap`.

## Before you start

Read the [MVP design](docs/superpowers/specs/2026-08-05-proof-of-participation-design.md) and the current milestone in the [implementation plan](docs/superpowers/plans/2026-08-05-proof-of-participation-mvp.md).

For M1, keep changes within the protocol package, circuit package, build scripts, tests, and project tooling. Product UI, relay, deployment, native apps, face matching, and device location claims belong to later work.

## Change rules

1. Open an issue before changing the proof statement, hash inputs, field encoding, signature scheme, public signals, or trusted-setup process.
2. Add a failing test before changing protocol or circuit behavior.
3. Add negative tests for altered signatures, public inputs, private inputs, ranges, and boundary values.
4. Never log or send an attendee secret, witness, credential private field, or organizer private key.
5. Keep generated proving files out of Git unless the release plan names the file as a small reviewed artifact.
6. State security limits in plain terms. A live QR can be forwarded.

## Pull requests

A pull request should contain:

- one clear change;
- the reason for the change;
- tests and the commands used to run them;
- any effect on the circuit, constraints, public signals, artifacts, or ceremony; and
- updates to the design or plan when protocol behavior changes.

Do not mix formatting, dependency, protocol, and circuit changes in one pull request unless they cannot be split safely.

## Commit style

Use short imperative commit subjects, such as:

```text
feat: add canonical field encoding
test: reject altered credential signatures
docs: explain QR forwarding limit
```

## Security reports

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).
