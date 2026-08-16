# Atlas

Atlas is a desktop-first AI workspace for conversations, coding, files, projects, and
public-information research. Its interface is conversation-first and intentionally simple: the
tools share one navigation system, one history surface, one provider boundary, and one security
model.

> **0.1.0 is a developer preview.** Atlas Native chat runs from Atlas-owned code and weights, but
> the small checkpoint is experimental. Atlas image generation has not been trained and is
> intentionally unavailable rather than being backed by a third-party model.

## Current product

- **Home:** a minimal launcher and universal prompt.
- **Chat:** saved conversations, streaming, attachments, dictation, stop, retry, copy, edit, rename,
  pin, and delete controls.
- **Image:** an honest capability-gated workspace reserved for a future Atlas-owned image model.
- **Code:** an Atlas-native coding mode with local project and file context. Files are never
  silently overwritten.
- **Search:** secure public HTTPS retrieval, local source snapshots, explicit citations, and
  prompt-injection isolation for retrieved text.
- **Library:** a shared session library that can send context to Chat, Code, or Image.
- **Projects:** persistent local project records and optional local-folder context.
- **History:** searchable, filterable, pinnable Chat, Image, Code, and Search activity.
- **Settings:** theme, accessibility preferences, provider adapters, encrypted secrets, local-model
  controls, security status, Extensions, and the VS Code companion.

The investigation UI has been removed from the active product. Its backend tables and versioned
API remain temporarily for non-destructive compatibility; they will be archived or exported before
the legacy schema is removed. See [the migration audit](docs/ai-workspace-migration.md).

## Desktop quick start

Install and verify the local development dependencies:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Start the local services (Docker Desktop must be running):

```powershell
docker compose up --build --detach db redis api model
```

Start the desktop development build from `frontend`:

```powershell
npm ci
npm run desktop:dev
```

Build a Windows application directory with `npm run desktop:dir`, or an installer with
`npm run desktop:package`. Output is written to `frontend/release`. The current desktop installer
does not bundle Python/PyTorch, so Atlas Native requires the repository's prepared `model/.venv`
and checkpoint; use Docker for a reproducible service deployment.

## Single-host deployment

Copy `.env.production.example` to `.env`, replace every placeholder with a strong unique value,
set the public hostname/CORS origin, then run:

```powershell
docker compose --env-file .env -f compose.release.yaml up --build --detach
```

The web service binds to loopback port 8080 by default. Put a trusted TLS reverse proxy in front of
it. The production profile disables the obsolete investigation API. See
[Deployment and operations](docs/deployment.md).

## Architecture

The Electron renderer has no Node.js access. Context isolation and Chromium sandboxing are enabled,
permissions are denied by default, external navigation is restricted, and privileged operations use
a narrow validated preload bridge. Provider credentials are encrypted by the operating system and
are never exposed to React.

The AI layer supports only Atlas Native: an Atlas-owned tokenizer, transformer, training pipeline,
corpus manifest, and checkpoint initialized from random weights. It does not use API keys, external
model APIs, or borrowed model weights. Public-web retrieval is HTTPS-only, rejects private and
reserved network destinations, limits response size, and never executes page scripts.

React Router owns workspace navigation, TanStack Query is ready for API-backed repositories, and
Zustand stores only local UI and migration-era session state. Feature workspaces are lazy-loaded.

See [Desktop architecture](docs/desktop.md), [Release audit](docs/release-audit.md),
[AI workspace migration](docs/ai-workspace-migration.md),
[Knowledge and RAG architecture](docs/knowledge-rag-architecture.md), and
[Extending Atlas](docs/extending.md).

## Knowledge foundation

Atlas uses the architecture `base model + retrieval + tools + explicit memory + project context +
live search`; the experimental native model is not expected to memorize the knowledge base. The
backend now includes provider capability contracts, signed expiring principals, user/project
ownership, pgvector-ready knowledge tables, additive migrations, and query-time scoped knowledge
source APIs. Ingestion, embeddings, hybrid retrieval, grounded Chat, and memory remain later
increments and are not represented as complete.

## Atlas-native AI

The experimental model in `model/` is initialized from random weights and uses an Atlas byte
tokenizer, transformer, training loop, and checkpoint format. The current small checkpoint proves
the independent training path; it is not represented as a production-quality general assistant.
See [Atlas Native Model](model/README.md).

## VS Code companion

Install the latest VSIX from `extensions/vscode-atlas`, then open **Settings → Security → VS Code
companion**, copy the pairing token, and run **Atlas: Connect to Desktop** from VS Code. The bridge
listens only on loopback, authenticates every request, and sends editor content only after an
explicit command.

## Verification

```powershell
cd backend
pytest
ruff check .

cd ../frontend
npm run lint
npm run build
npm run test:security
```

## Project layout

```text
backend/       FastAPI, SQLAlchemy, PostgreSQL, and Redis foundation
frontend/      React workspaces and secure Electron desktop host
model/         Experimental from-scratch Atlas model
extensions/    Companion extensions, including Atlas for VS Code
docs/          Architecture, migration, and extension documentation
compose.yaml   Local development services
```

Atlas is distributed under the [MIT License](LICENSE).
