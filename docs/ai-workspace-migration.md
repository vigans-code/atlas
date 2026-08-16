# Atlas AI workspace migration

Atlas is changing from an investigation workspace into a conversation-first AI workspace. This
document records the repository audit and the safe migration boundary before investigation domains
are removed.

## Current architecture

- `frontend/src`: React renderer, Zustand local state, feature workspaces, and shared shell.
- `frontend/electron`: sandboxed Electron host, provider adapters, secure credential handling,
  streaming, public-web retrieval, local file selection, dictation, and VS Code companion bridge.
- `backend/app`: versioned FastAPI service using async SQLAlchemy.
- `backend/alembic`: PostgreSQL schema migrations.
- `model`: experimental Atlas-native model training and loopback inference service.
- `extensions/vscode-atlas`: authenticated VS Code companion.
- `compose.yaml`: PostgreSQL, Redis, API, renderer development server, and model service.

## Repository classification

### Reuse

- Electron security controls, preload boundary, IPC sender validation, OS-backed secret storage,
  provider adapters, cancellation and streaming.
- Docker, PostgreSQL, Redis, FastAPI application setup, logging, health checks, migrations, and
  request security headers.
- Chat streaming and attachments, Image provider integration, Code provider mode, safe Research
  fetching, local project selection, Extensions, settings, and VS Code companion.
- Atlas mark, error boundary, navigation primitives, Zustand persistence, design tokens, reduced
  motion, and responsive foundations.

### Refactor

- `features/chat` becomes the primary product experience with durable conversation operations.
- `features/images` becomes `Image` and gains generation history and editing workflows.
- `features/code` and `features/projects` become one Code workspace with explicit diffs and apply
  confirmation before filesystem writes.
- `features/research` becomes Search; its secure public-web retrieval is one provider, not the whole
  search architecture.
- `stores/chats`, `stores/projects`, and `stores/research` move toward API-backed conversations,
  files, code sessions, and unified history.
- Settings copy and information architecture change from investigation terminology to General,
  Appearance, AI, Security, Data, and API.

### Remove from the active product

- Dashboard statistics, Investigations, Investigation Workspace, Collect, Intelligence, and
  Reports routes and navigation.
- Investigation-specific UI helpers and API client types once no active screen imports them.
- Investigation, source, evidence, entity, and relationship backend domains after a non-destructive
  data export/archive migration is available.
- Investigation roadmap language and tests after the replacement conversation domains are tested.

### Keep temporarily

- Existing investigation database tables, migrations, and versioned API endpoints. Removing them
  immediately could destroy local user data and break older clients. They are compatibility-only
  during the transition and must not appear in the new main UI.
- Extensions remain a secondary settings destination rather than primary navigation.
- The Atlas-native model remains an experimental AI setting, not a product claim.

## Target frontend structure

```text
src/
|-- app/                 # providers, route composition, startup
|-- components/          # shared accessible UI primitives
|-- features/
|   |-- home/
|   |-- chat/
|   |-- image/
|   |-- code/
|   |-- search/
|   |-- files/
|   |-- history/
|   |-- auth/
|   `-- settings/
|-- layouts/             # desktop and mobile workspace shells
|-- hooks/
|-- lib/                 # clients and provider-neutral utilities
|-- routes/
|-- stores/              # ephemeral UI state only
|-- styles/
`-- types/
```

The migration will move files toward this layout incrementally to keep each build reviewable.

## Target routes

- `/` — minimal Atlas home and universal composer
- `/chat` and `/chat/:conversationId`
- `/image` and `/image/:conversationId`
- `/code` and `/code/:sessionId`
- `/search` and `/search/:sessionId`
- `/files`
- `/history`
- `/settings`
- `/extensions` — secondary

## Backend target domains

`auth`, `users`, `conversations`, `messages`, `ai`, `images`, `code_sessions`, `files`, `search`,
`history`, `usage`, `settings`, `jobs`, and `audit`.

Messages will use ordered content blocks so text, images, files, citations, tool activity, and future
modalities do not require incompatible message tables. Provider-specific identifiers remain behind
adapter boundaries.

## Implementation sequence

1. Replace investigation navigation with the AI-first shell and routes.
2. Make Chat the primary durable workflow and add unified history operations.
3. Create the central file library and shared attachment references.
4. Refactor Image, Code, and Search onto common conversation/session primitives.
5. Introduce FastAPI conversation, message, file, and history domains.
6. Move renderer persistence to TanStack Query-backed API repositories with offline-safe errors.
7. Add authentication and permission-scoped storage.
8. Export/archive legacy investigation data, then remove compatibility APIs and tables.
9. Complete accessibility, performance, packaging, and production-security gates.

## Product identity and interaction model

Atlas uses an original atom mark: three broken elliptical paths, a central hexagonal nucleus, and
one off-axis node. The mark is provided as dark, light, monochrome, favicon, and React-component
variants. Motion is limited to loading and active-generation states and respects reduced-motion
preferences.

The reusable Atlas composer is the entry point for Home and Chat. It supports text, uploads,
library handoff, pasted context, stop-generation, speech input, and explicit capability selection.
`Auto` remains the default; Image, Code, and Search route into their dedicated workspaces, while
unimplemented Research and Data capabilities remain visibly unavailable rather than simulated.

Conversation branching copies messages only through the selected branch point, assigns fresh
message identifiers, records the parent conversation, and never mutates the original. Archiving is
separate from deletion so users can remove conversations from Recent without losing them.

## Persistence domains and migration boundary

The durable AI-workspace schema should be introduced in additive migrations before legacy tables
are retired:

- `users`, `sessions`, `credentials`, and `user_settings`
- `conversations`, `messages`, `message_content_blocks`, and `message_citations`
- `files`, immutable `file_blobs`, `attachments`, and `file_derivatives`
- `image_generations`, `code_sessions`, `code_changes`, and `search_sessions`
- `activity_events`, `jobs`, `usage_events`, and `audit_events`

Conversation rows carry type, title, parent/branch references, pinned/archived state, timestamps,
and provider-neutral metadata. Message content blocks make text, images, files, citations, and tool
activity composable without provider-specific columns. Files are referenced rather than copied;
blob hashes support deduplication and integrity checks.

Legacy investigation data remains read-compatible until Atlas can export it and an explicit user
or administrator approves archival. No destructive migration belongs in the AI-shell rollout.

## Delivery phases

### Initial

- AI-first shell, responsive sidebar, Home, Chat, Image, Code, Search, Files, History, and Settings
- Original atom identity, universal composer, command palette, streaming cancellation
- Durable conversation APIs, authentication, file references, and baseline accessibility tests

### Next

- Provider-neutral image history/editing, code diffs with explicit apply, structured OSINT modules
- Unified server-backed history, branching sync, export, source citations, and retention controls
- Background job progress, rate-limit visibility, API-key lifecycle, and recovery workflows

### Later

- Research, Data, Maps, Voice, custom assistants, plugin SDK, organization collaboration, and SSO
- Only promote these after core reliability, privacy, provenance, and provider failure handling are
  measurable in production.
