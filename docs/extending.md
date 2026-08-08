# Extending Atlas

Atlas separates primary workflows from optional capabilities. The primary navigation stays small;
additional behavior belongs in feature modules, model adapters, tools, or plugins.

## Capability registry

`frontend/src/features/catalog/featureCatalog.ts` is the UI-facing registry. Each entry has a stable
identifier, name, category, description, and status. `available` means the capability has working
product behavior. `extension` means the architecture reserves an explicit integration point; it
must not be described as implemented.

Add meaningful capabilities to an existing category when possible. New categories should represent
a durable subsystem rather than a single screen or vendor.

## Frontend modules

Feature UI lives under `frontend/src/features/<feature>`. Modules should expose a small public
component surface, avoid importing another feature's internal components, and keep provider-specific
logic outside the renderer.

## Model adapters

Chat, code, and image providers will be backend adapters behind versioned API contracts. Adapters
must implement timeouts, cancellation, bounded retries, redacted logging, health checks, and clear
error mapping. Credentials belong in environment secrets or an operating-system credential vault.

## Extension manifests

The Extensions screen can export a manifest template and import reviewed JSON manifests. A manifest
uses schema version `1`, a reverse-domain `id`, semantic `version`, human-readable metadata, and an
explicit `permissions` array. Native validation limits manifests to 64 KB and returns only sanitized
fields to the renderer.

Imported manifests are metadata only. Atlas does not load entry points, evaluate scripts, install
dependencies, or download packages. The enable switch records community testing intent; it does not
grant privileges or execute code.

## Execution roadmap

The planned plugin boundary supports tools, model adapters, commands, panels, themes, and prompt
packs. Execution requires signed packages, publisher identity, declared permissions, compatibility
ranges, process isolation, resource quotas, update verification, revocation, audit logs, and a
moderated distribution process.

## Customization

Persistent appearance and behavior preferences live in `frontend/src/stores/ui.ts`. Add preferences
only when they produce visible behavior, remain backward-compatible, and have a safe default.
