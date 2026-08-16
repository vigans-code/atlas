# Atlas knowledge, RAG, memory, and tools architecture

This document records the repository audit and the implementation boundary for Atlas's knowledge
layer. Atlas will use replaceable base models plus retrieval, tools, explicit memory, project
context, and live public research. The experimental model in `model/` remains a learning path, not
the production knowledge strategy.

## Repository audit

### KEEP

- The conversation-first desktop shell and Chat, Image, Code, Search, Files, History, Settings,
  Projects, and Extensions feature boundaries.
- FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, Redis, Docker Compose, health checks, structured
  request IDs, and secure response headers.
- The sandboxed Electron renderer, narrow preload bridge, trusted-sender checks, OS file picker,
  HTTPS-only public retrieval, cancellation, response bounds, and OS-encrypted provider secrets.
- Legacy investigation tables temporarily, solely for non-destructive compatibility.

### REUSE

- `frontend/electron/provider.cjs` as the current desktop chat/image adapter. Its configuration,
  cancellation, loopback restrictions, and credential storage become implementations behind the
  same capability vocabulary used by the backend.
- `frontend/electron/research.cjs` as a bounded live-web source adapter, not as persistent curated
  knowledge or a general crawler.
- `frontend/src/stores/files.ts`, `projects.ts`, and `research.ts` as migration-era UX state. Their
  durable identities will move to API-backed repositories.
- TanStack Query for server state and Zustand only for ephemeral interface state.

### REFACTOR

- Provider selection from vendor-shaped branches into capability contracts: chat, streaming,
  embeddings, images, reranking, speech, vision, structured output, and tools.
- Files from temporary OS-picker handles into immutable blobs plus file metadata and knowledge
  source references. Original files remain untrusted and are never executed.
- Projects from local cards into server-owned scopes with membership checked inside every query.
- Search from saved browser snapshots into provider-normalized live results with provenance.
- Chat prompt assembly into independently tested routing, retrieval, context budgeting, citation
  validation, and provider execution stages.

### ADD

- Authenticated users, projects, memberships, knowledge sources/documents/versions/chunks,
  embeddings, ingestion jobs, citations, memories, research sessions, tools, and code indexes.
- PostgreSQL `pgvector`, PostgreSQL full-text search, additive migrations, and background workers.
- Query-time authorization, hybrid ranking, deduplication, source trust/freshness, prompt-injection
  isolation, evaluation datasets, and retrieval observability.

### REMOVE OR RETIRE

- The production claim that a small from-scratch checkpoint is Atlas's general intelligence.
- Direct provider branching from React and, after backend provider parity exists, duplicated
  orchestration in Electron.
- Legacy investigation APIs only after an explicit export/archive migration exists.
- Any fake RAG response, invented citation, cross-user cache, silent memory, unbounded crawler, or
  arbitrary model-to-function execution.

## Current gaps

- There is no backend user authentication or project authorization boundary.
- PostgreSQL uses the stock image; `pgvector` and the Python vector type are not configured.
- Redis exists, but no Celery application, worker, task model, or retry policy exists.
- Files are picker handles held in Electron memory and readable text is injected directly into a
  prompt; there is no durable blob, parser, version, chunk, or index.
- Projects are local Zustand records. No backend membership or scope is enforced.
- Provider abstractions exist only as a desktop module, with no embedding or reranking contract.

## Exact data domains

### Identity and projects

- `users`: id, normalized email, display name, active state, timestamps.
- `projects`: id, owner user, name, description, timestamps, archived timestamp.
- `project_memberships`: project, user, role, timestamps; unique per project/user.

Authentication credentials, password hashes, sessions, MFA, and recovery tokens belong in
separate tables. They are not overloaded into `users`.

### Knowledge core

- `knowledge_categories`: database-managed hierarchy with slug, name, parent, and metadata.
- `knowledge_sources`: global/user/project scope, owner, project, source type, canonical URL,
  provider, trust, language, enabled state, refresh policy, freshness timestamps, and metadata.
- `knowledge_documents`: source, title, type, language, status, current version, and soft deletion.
- `knowledge_document_versions`: content hash, version number, original/normalized blob locations,
  publication/retrieval/processing times, parser version, and metadata.
- `knowledge_chunks`: version, sequence, heading path, content, token count, offsets, page/symbol
  metadata, and PostgreSQL full-text vector.
- `knowledge_embeddings`: chunk, provider, model, dimension, vector, and creation time. The initial
  index uses one configured dimension; a model/dimension change requires a new compatible index or
  a deliberate re-embedding migration.
- `knowledge_ingestion_jobs`: source/document, state, progress, stage, safe error, task ID, and
  timing.
- `knowledge_citations`: response/request identity plus source/chunk and an immutable provenance
  snapshot. Citations are created only from records selected by retrieval.

### Later additive domains

- `files`, `file_blobs`, and `file_derivatives`: hashes, MIME validation, storage references,
  quarantine state, and ownership. Documents reference blobs; blobs are not duplicated per use.
- `memories`: user, category, concise content, source, confidence, enabled state, sensitivity flag,
  timestamps, and deletion. Raw chats and secrets are forbidden.
- `research_sessions`, `research_steps`, `research_sources`, and `research_findings`: bounded,
  cancellable, cited workflows without hidden chain-of-thought storage.
- `tool_definitions`, `tool_executions`, and `tool_approvals`: typed schemas, permissions, timeout,
  rate limits, confirmation policy, structured results, and provenance.
- `code_repositories`, `code_files`, `code_symbols`, `code_references`, and `code_index_jobs`:
  exact symbol/path/reference search alongside semantic retrieval.

## Relationships and deletion behavior

- A user owns projects and user-scoped sources; project sources require current membership.
- A source owns documents; a document owns immutable versions; a version owns chunks; a chunk owns
  compatible embeddings.
- Soft-deleting or disabling a source excludes it at the first retrieval query. A purge job then
  removes chunks, vectors, derivatives, and caches according to retention policy.
- A citation points to a source and optionally a chunk, but retains a minimal title/URL/location
  snapshot so an old response remains explainable after a permitted source update.
- Authorization predicates are included in SQL before keyword/vector candidates are selected.

## Migration plan

1. Enable `vector`; add identity/project and knowledge-core tables without modifying legacy data.
2. Seed the local owner only through an explicit onboarding/auth flow—never a migration default.
3. Add blob/file tables and isolated ingestion workers.
4. Add full-text and vector indexes after representative query measurement; initial PostgreSQL uses
   GIN for text and HNSW cosine search for the configured embedding dimension.
5. Add conversations/messages/citations and switch Chat to API persistence.
6. Add memory, research, tools, and code intelligence as independent migrations.
7. Export/archive legacy investigation data, then retire legacy routes and tables explicitly.

Downgrades remove only objects introduced by their own revision. No migration silently converts or
deletes existing user data.

## Provider contracts and routing

`AIProvider` advertises capabilities and implements only supported operations. Requests and results
use provider-neutral types. A registry resolves a configured provider by required capability and
fails explicitly when unavailable. Credentials remain in the server secret store or OS vault.

Initial modes are explicit: `auto`, `fast`, `reasoning`, `coding`, `creative`, and `vision`. `auto`
starts as a small policy based on required capability and configuration—not a giant heuristic. The
backend will own retrieval and context assembly; the selected provider only receives the bounded
request.

Streaming emits public lifecycle events such as retrieval started/completed, tool started/completed,
message delta, citation, completion, and failure. It never emits private model reasoning.

## Ingestion architecture

1. Upload/acquire into quarantine storage and compute SHA-256 while enforcing size limits.
2. Validate declared extension, detected MIME, ownership, archive depth, and allowed format.
3. Parse in an isolated, network-disabled worker with CPU, memory, time, and output limits.
4. Normalize text and metadata without executing macros, scripts, binaries, or embedded content.
5. Select a type-aware chunker: headings for docs/Markdown, symbols for code, page/section for PDF,
   and schema operations for tabular data.
6. Persist an immutable document version and chunks with provenance.
7. Embed through the configured capability and build keyword indexes.
8. Mark the version searchable atomically; failures retain a safe job error and never expose a
   partially indexed version.

Celery/Redis will run ingestion, re-indexing, research, exports, and large code/data jobs. Tasks are
idempotent by source/version/content hash and use bounded retries with cancellation checks.

## Retrieval and context architecture

The pipeline is query normalization → capability/scope selection → authorized semantic candidates
+ authorized keyword candidates → metadata filters → canonical/hash deduplication → explainable
weighted reranking → token-budgeted context → provider request → citation validation.

Initial ranking uses testable weighted reciprocal-rank fusion. Later rerankers are optional
capabilities. Trust and freshness are bounded signals, not truth. Historical intent suppresses the
freshness preference. The context builder budgets system policy, user request, recent conversation,
relevant memory, project chunks, global chunks, and tool output independently.

If retrieval is weak, Atlas says evidence is insufficient or offers an explicit live search. It
does not manufacture a source to satisfy an answer format.

## Citations

Retrieval returns typed citation candidates containing source/document/chunk IDs, title, canonical
URL or file reference, page/heading/symbol, dates, excerpt, trust indicator, and score. Prompt text
uses opaque citation IDs. A validator rejects any model citation not present in the supplied
candidate set. The UI renders compact markers and an expandable Sources panel; private file links
open only after a fresh authorization check.

## Memory

Memory is opt-in and separate from documents and chat history. Explicit user edits are immediately
authoritative. Suggested memory requires confirmation initially. Retrieval is category- and
relevance-filtered with a small context budget. Users can view, disable, edit, delete, clear, and
export memory; sensitive data and secrets are rejected.

## Projects

Projects scope chats, files, code, documents, searches, and research. Project membership is checked
at write time and inside retrieval SQL. User-private and global sources may be included only when
the user enables those scopes. Organization scope is postponed until tenant isolation, admin roles,
and audit retention are production-ready.

## Tools and research

Only registered tools are callable. Each definition includes input/output schemas, permission,
confirmation, timeout, availability, safety class, and rate limit. The executor validates model
arguments again, applies authorization, records provenance, and returns structured output.
Destructive, external-message, integration-changing, or expensive actions require confirmation.

Research is a bounded state machine: plan concise public steps, retrieve, deduplicate, compare,
flag conflicts, and synthesize with validated citations. It exposes progress and cancellation, not
private chain-of-thought. Step count, domains, bytes, duration, and tool cost are capped.

## API surface

Initial authenticated endpoints:

- `GET/POST /api/v1/knowledge/sources`
- `GET/DELETE /api/v1/knowledge/sources/{id}`

Subsequent endpoints:

- `POST /knowledge/sources/{id}/ingest`, `POST /knowledge/sources/{id}/reindex`
- `GET /knowledge/documents`, `GET /knowledge/documents/{id}`
- `POST /knowledge/search`, `POST /knowledge/retrieve`
- `GET /knowledge/jobs`, `GET /knowledge/jobs/{id}`
- `GET/POST/PATCH/DELETE /memory`, `POST /memory/clear`, `PATCH /memory/settings`
- `GET /projects/{id}/knowledge`, `POST /projects/{id}/knowledge/search`
- `POST /ai/responses` with typed streaming events and server-enforced scopes
- `POST /research/sessions`, `GET /research/sessions/{id}`, `POST .../{id}/cancel`

Raw embeddings, internal prompts, secret configuration, stack traces, and worker topology are not
API resources.

## Frontend changes

- Chat: subtle retrieval status, explicit Web toggle, project scope, validated inline citations,
  and expandable Sources panel.
- Files: durable upload/index state, supported-type and size errors, source details, re-index, and
  delete semantics.
- Projects: active project scope, files/knowledge overview, and access-aware search.
- Settings → Knowledge: Atlas/project knowledge, automatic web use, indexing, memory opt-in,
  source management, and delete-index controls.
- Knowledge browser remains secondary to Chat. Research and Data remain unavailable until their
  backend state machines are real.

## Security and privacy controls

- Signed expiring bearer sessions initially; password/MFA/session issuance is a separate auth
  phase. Production rejects the default secret and binds no unauthenticated knowledge endpoint.
- Owner/project predicates at query time; indistinguishable 404 responses prevent ID probing.
- MIME/extension/size/hash validation; isolated parsing; no macros, binaries, scripts, or archive
  extraction in the initial parser.
- Retrieved content is delimited as untrusted data and cannot override system policy, permissions,
  configuration, or tool confirmation.
- Per-user/provider rate limits, request and output bounds, redacted structured logs, no document
  bodies in default logs/metrics, and no cross-user answer cache.
- Deletion immediately excludes content from retrieval and schedules physical purge/cache
  invalidation. User content is never used for training without explicit consent.

## Test plan

- Unit: provider capability registry, URL/source validation, chunkers, rank fusion, budgets,
  citation validation, memory filters, and tool schema enforcement.
- Security: invalid/expired tokens, user A versus user B, project membership, disabled/deleted
  source exclusion, source-ID probing, prompt injection, malformed uploads, and deletion.
- Integration: migrations on pgvector PostgreSQL, version deduplication, ingestion state changes,
  hybrid retrieval, citation correctness, worker retry/cancel, and cache invalidation.
- Evaluation: golden questions with expected sources/facts and forbidden claims; track recall,
  precision, groundedness, citation correctness, latency, and context size.
- Performance: many chunks, concurrent scoped queries, large files/history, embedding batches, and
  index behavior using production-like PostgreSQL—not SQLite benchmarks.

## Phased implementation

1. **Provider and ownership foundation:** capability contracts, signed principal boundary, users,
   projects/memberships, pgvector-ready knowledge models, source APIs, migrations, isolation tests.
2. **Safe ingestion:** blob storage, validators, TXT/Markdown/JSON/CSV/HTML parsers, type-aware
   chunking, Celery jobs, version hashing, explicit job UI.
3. **Retrieval:** embeddings, full-text search, authorized hybrid ranking, deduplication, context
   budgets, retrieval metrics, and golden tests.
4. **Grounded Chat:** API conversations, streaming lifecycle events, citations, Sources panel,
   confidence/insufficient-evidence behavior.
5. **Project knowledge and memory:** durable project scopes, membership tests, opt-in memory and UI.
6. **Tools and research:** typed registry/executor, normalized search providers, bounded cited
   research sessions.
7. **Code/data intelligence and scale:** symbols/references, deterministic table operations,
   measured index tuning, enterprise scopes only when required.

The first implementation increment stops after phase 1. It does not claim that ingestion,
embeddings, hybrid retrieval, grounded Chat, memory, or Research are complete.
