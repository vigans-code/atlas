# Security policy

Atlas is under active development. Model providers, command execution, extension execution, and
remote distribution remain disabled until their trust boundaries are implemented and reviewed.

## Reporting a vulnerability

Do not publish exploit details, credentials, private files, or personal information in a public
issue. Contact the repository maintainer privately with the affected version, reproduction steps,
impact, and the smallest evidence required to demonstrate the problem.

## Desktop security boundary

- The renderer is sandboxed with Node.js integration disabled and context isolation enabled.
- Native capabilities are exposed through a narrow preload bridge.
- Every privileged IPC handler validates that the sender is the trusted Atlas renderer.
- Native file and folder access requires an explicit operating-system picker.
- Permission requests are denied by default, including camera, microphone, location, payment, USB,
  serial, and Bluetooth access.
- Webviews and unexpected top-level navigation are blocked.
- Production content uses a private secure protocol with CSP, no-sniff, referrer, and permissions
  headers.
- External navigation is restricted to HTTPS and opens in the system browser.

## Extension security

Atlas currently imports extension manifests as metadata only. It does not download or execute
extension code. Manifests are selected explicitly by the user, limited to 64 KB, parsed as JSON,
validated against required fields, sanitized, and stored without executable contributions.

Before extension execution can ship, Atlas requires package signatures, publisher identity,
permission review, process isolation, resource quotas, update verification, revocation, audit logs,
and a moderated distribution policy.

## Provider and agent requirements

- API keys must be stored in the backend or operating-system credential vault, never local storage.
- Model calls require timeouts, cancellation, bounded retries, redacted logs, and usage limits.
- File changes require explicit workspace scope and reviewable diffs.
- Command execution requires allowlisted working directories, visible approval, output limits, and
  cancellation.
- Generated code and images must be labeled until verified by the user.

## Release requirements

- Sign desktop installers and publish checksums and an SBOM.
- Run dependency, secret, static-analysis, and container scans in CI.
- Apply updates through a reviewed, reproducible release pipeline.
- Encrypt backups and verify restoration.
- Add authentication, authorization, rate limiting, and audit persistence before exposing backend
  services to an untrusted network.
