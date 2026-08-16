# Atlas release audit

Audit date: 2026-08-16. Target release: 0.1.0.

This document is the implementation baseline for the first public Atlas release. A capability is
called complete only when its user-visible path, storage, failure states, and tests exist.

## A. Current architecture

- Desktop/web client: Electron, React, TypeScript, Vite, Tailwind, Zustand, and React Router.
- API: FastAPI, SQLAlchemy, Alembic, PostgreSQL/pgvector, and Redis.
- AI: the Atlas Native Python service and Atlas-owned checkpoint. No hosted AI API or Ollama is
  required or enabled.
- Distribution: Electron Builder for Windows and Docker Compose for web services.
- Companion tooling: an Atlas VS Code extension with a local bridge.

## B. Verified working foundations

- Secure Electron context isolation and allowlisted IPC.
- Persisted chat history with rename, pin, archive, branching, attachments, and stop controls.
- Atlas Native health/startup integration and basic streamed chat.
- Responsive application shell, themes, command palette, settings, and brand assets.
- API health checks, versioned routes, migrations, structured logging, and knowledge authorization.
- Projects and a file-library UI foundation.

## C. Release blockers found

- Account registration, login, and revocable sessions did not exist. Addressed in this release pass.
- The original web container ran the Vite development server and the Compose file used development
  credentials and reload mode.
- Addressed: Windows Setup now embeds a PyInstaller one-folder Atlas Native service, CPU PyTorch,
  and the Atlas checkpoint under Electron resources.
- Release automation, checksums, backup/restore scripts, a license, and a changelog were absent.

## D. Image generation

Image generation is not implemented. The UI must state this plainly and must not fabricate output.
Atlas will enable it only after an Atlas-owned image model, worker isolation, durable artifact
storage, job cancellation, provenance, and safety limits have been built and tested.

## E. Incomplete product areas

- Projects are local-only and Files are session-only; both need authenticated durable storage.
- Code lacks Monaco, project-wide change sets, diff approval, and safe apply/undo.
- Search is a research launcher, not yet a normalized multi-provider OSINT result system.
- RAG has authorization-aware data models but not a complete ingestion/retrieval pipeline.
- Data/artifact pipelines, long-term memory, share links, and a durable job queue are future work.

## F. Security audit

- Positive: Electron isolation, HTTPS-only research fetches, secret validation, secure headers,
  source provenance, and cross-user knowledge tests.
- Addressed: password hashing, session creation, validation, and revocation.
- Remaining: legacy investigation endpoints must be retired or authenticated; authentication needs
  distributed rate limiting; production should terminate TLS at a trusted reverse proxy; uploads
  need quotas, malware scanning, and content-disposition hardening before being exposed remotely.

## G. UX audit

- Files and Library naming is inconsistent.
- The New menu and command palette do not expose every current workspace.
- The large feature catalog overstates implemented capability and must be replaced by truthful
  capability/status information.
- Image controls should remain disabled while no image engine exists.
- Native browser prompts should be replaced with accessible dialogs incrementally.

## H. Packaging gaps

The original repository had no CI/release workflows, production Compose overlay, web reverse proxy,
install verifier, database backup/restore helpers, release archive, or checksum generation.

## I. Keep, refactor, retire

- Keep: Electron security boundary, Atlas branding, Chat store, Atlas Native runtime, health checks,
  knowledge authorization, migrations, shared UI primitives, and Docker foundations.
- Refactor: production Docker, provider status, navigation, files/projects persistence, settings,
  error handling, and desktop model bundling.
- Retire from public navigation/API: investigation, evidence, entity, relationship, and formal-report
  workflows. Preserve their migrations until a documented data-migration policy exists.

## J. Implementation order

1. Establish versioning, licensing, this audit, authentication, and production-safe configuration.
2. Build production containers, install/verify/backup/release scripts, and CI/release workflows.
3. Correct navigation, capability status, Files/Library naming, and error/empty states.
4. Add durable conversations, files, projects, jobs, and artifacts behind authenticated APIs.
5. Complete Code diff approval and normalized Search providers.
6. Build Atlas-owned retrieval, evaluation, and only then Atlas-owned image generation.

## Definition of the 0.1.0 release

Version 0.1.0 is an honest preview of Atlas Native chat and the workspace foundations. Windows Setup
is locally self-contained, but the release does not claim production image generation or complete
multi-user durability. Those boundaries must appear in release notes and the UI.
