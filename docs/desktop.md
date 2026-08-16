# Atlas desktop architecture

Atlas uses Electron as a thin desktop host around a React-based AI workspace. The interface centers
Chat, Image, Code, Search, Files, and unified History with accessible, low-distraction styling.

## Process boundary

The Electron main process owns the native window. The React renderer has no Node.js access. A sandboxed preload exposes only the allowlisted `minimize`, `maximize`, and `close` window controls.

`nodeIntegration` is disabled, `contextIsolation` and Chromium sandboxing are enabled, permission requests are denied, unexpected navigation is blocked, and new HTTP links are opened in the system browser. Packaged renderer files are served from the private `atlas://app` protocol instead of an unsafe `file://` null origin.

## Local services

The desktop uses a narrow validated IPC request bridge to connect to the Atlas FastAPI service at
`http://127.0.0.1:8000/api/v1`. This avoids granting the secure renderer general network access.
PostgreSQL, Redis, and FastAPI run through Docker Compose:

```powershell
docker compose up --build --detach db redis api
```

New conversation repositories will use this service instead of silently substituting browser-local
production data. During the migration, some session state remains local and the investigation API
is compatibility-only. Before external distribution, the backend will be bundled as a signed
sidecar or configured as a secured remote service with authentication and explicit lifecycle
management.

## Development

From `frontend` with Node.js 22.12 or newer:

```powershell
npm ci
npm run desktop:dev
```

This starts Vite on loopback and Electron together. Browser preview remains available through Docker for renderer-only work.

## Packaging

```powershell
npm run desktop:dir
npm run desktop:package
```

The first command creates an unpacked Windows application. The second creates an NSIS installer. Production releases should add a custom icon, Windows code signing, SBOM generation, artifact checksums, and CI-based reproducible builds.
