# Atlas desktop architecture

Atlas uses Electron as a thin desktop host around a clean React-based AI research workspace. The interface uses a conventional conversation layout with restrained desktop navigation and accessible, low-distraction styling.

## Process boundary

The Electron main process owns the native window. The React renderer has no Node.js access. A sandboxed preload exposes only the allowlisted `minimize`, `maximize`, and `close` window controls.

`nodeIntegration` is disabled, `contextIsolation` and Chromium sandboxing are enabled, permission requests are denied, unexpected navigation is blocked, and new HTTP links are opened in the system browser. Packaged renderer files are served from the private `atlas://app` protocol instead of an unsafe `file://` null origin.

## Local services

The current milestone connects to the Atlas FastAPI service at `http://localhost:8000/api/v1`. PostgreSQL, Redis, and FastAPI run through Docker Compose:

```powershell
docker compose up --build --detach db redis api
```

The desktop UI shows a degraded state when this local service is unavailable. Before external distribution, the backend will be bundled as a signed Python sidecar with per-installation secrets and explicit lifecycle management.

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
