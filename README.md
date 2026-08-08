# Atlas

Atlas is a customizable desktop AI workspace for coding, general chat, projects, and image creation.

The current application includes:

- Code Agent and normal Chat as separate workflows.
- Project and image workspaces.
- A community Extensions workspace with validated manifest import and development templates.
- Persistent appearance and layout preferences.
- A data-driven registry of 120 capability extension points.
- A secure Electron shell with an isolated renderer.
- An authenticated VS Code companion with sidebar chat and explicit editor-context commands.
- A browser preview for rapid frontend development.
- A FastAPI, PostgreSQL, and Redis foundation for future model providers and background jobs.

> Development status: the desktop interface, Atlas-native model, research workspace, and VS Code
> companion are usable. Direct agent file edits, terminal execution, durable projects, and local
> image generation remain intentionally unavailable until their permission boundaries are complete.

## Desktop quick start

From `frontend`, install dependencies and start the desktop development build:

```powershell
npm ci
npm run desktop:dev
```

Build a Windows application directory with `npm run desktop:dir`, or an installer with
`npm run desktop:package`. Output is written to `frontend/release`.

The current renderer runs without the backend. Docker services remain available for backend and
provider development:

```powershell
docker compose up --build
```

See [Desktop architecture](docs/desktop.md) and [Extending Atlas](docs/extending.md).

## VS Code companion

Install `extensions/vscode-atlas/atlas-companion-0.1.0.vsix` through **Extensions: Install from
VSIX…**. In Atlas, open **Settings → Security → VS Code companion**, copy the pairing token, and
run **Atlas: Connect to Desktop** from the VS Code Command Palette.

The companion listens only on `127.0.0.1`, authenticates every capability request, keeps its token
in VS Code SecretStorage, and sends editor contents only through explicit selection or file-review
commands. See [the extension guide](extensions/vscode-atlas/README.md) for commands and development.

## Atlas-native AI

Atlas now includes a language model initialized and trained from random weights. Its byte tokenizer,
transformer implementation, verified-corpus loader, checkpoint format, training loop, and local
inference service live in `model/`. The model loader rejects checkpoints that are not marked as
Atlas's `atlas-scratch-v1` random-initialization format.

The first 2.7-million-parameter checkpoint is deliberately small enough for the current development
computer. It proves the full independent training path but needs substantially more original or
properly licensed training material before it can become a broadly capable assistant. See
[Atlas Native Model](model/README.md) for training and provenance rules.

## Verification

```powershell
cd backend
pytest
ruff check .

cd ../frontend
npm run lint
npm run build
npm audit
npm run test:security
```

## Architecture

The Electron main process and React renderer have strict boundaries. Electron exposes only
allowlisted window controls through an isolated preload bridge. Packaged files use the private
`atlas://app` protocol. The renderer has no Node.js access.

Frontend capabilities are organized as independent feature modules. The capability registry is
metadata-driven so contributors can add categories and extension points without expanding the
primary navigation. Persistent UI preferences use a small Zustand store.

The backend is an API-first foundation for model adapters, secure credential handling, durable
projects, job processing, and future plugins. Secrets must never be placed in renderer code.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, quality checks, and contribution conventions.

No open-source license has been selected yet. A license must be added before this repository can be
distributed as open source; MIT, Apache-2.0, and GPL-3.0 have different downstream obligations.

## Project layout

```text
backend/       FastAPI service foundation
frontend/      React renderer and Electron host
model/         From-scratch Atlas tokenizer, transformer, training, and inference
extensions/    Companion extensions, including Atlas for VS Code
docs/          Architecture and extension documentation
compose.yaml   Local backend development stack
```
