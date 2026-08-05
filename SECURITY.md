# Security policy

## Supported versions

`zk-poap` has no supported production release yet. The current code and documents are for development and review.

## Reporting a vulnerability

Do not post a vulnerability, secret, proof witness, private key, or ceremony entropy in a public issue.

After the GitHub repository enables private vulnerability reporting, use the repository's **Security → Report a vulnerability** form. Until then, contact a maintainer through a private channel and share only the minimum information needed to arrange a secure report.

A useful report includes:

- the affected commit or circuit version;
- the security property that fails;
- a small reproduction or test case;
- whether secrets, proof soundness, unlinkability, signatures, nullifiers, or setup artifacts are affected; and
- any known workaround.

## High-impact areas

Treat these issues as high impact:

- forging a credential or Groth16 proof;
- extracting attendee or organizer secrets;
- linking one attendee across events from protocol data;
- accepting the wrong event, context, assurance level, or nullifier;
- bypassing circuit range or signature checks;
- replacing circuit artifacts without a hash failure; or
- compromising a phase-2 ceremony or release key.

The documented ability to forward a live QR code is a known MVP limit, not a vulnerability by itself.
