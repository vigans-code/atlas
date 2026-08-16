# Deployment and operations

## Supported release paths

- Docker Compose is the reproducible single-host path for the web, API, database, cache, and Atlas
  Native model services.
- The Electron package is currently a Windows developer preview. It needs a prepared local model
  environment and is not yet a self-contained model installer.

## Production installation

Requirements: Docker Engine with Compose v2, a TLS-capable reverse proxy, and enough disk/RAM for
PostgreSQL and the Atlas model checkpoint.

1. Clone a tagged Atlas release.
2. Copy `.env.production.example` to `.env`.
3. Generate independent random values for the database, Redis, and Atlas secret. The Atlas secret
   must contain at least 32 characters. URL-encode reserved characters inside connection URLs.
4. Replace `atlas.example.com` in the CORS and trusted-host values.
5. Validate configuration:

   ```sh
   docker compose --env-file .env -f compose.release.yaml config --quiet
   ```

6. Start Atlas:

   ```sh
   docker compose --env-file .env -f compose.release.yaml up --build --detach
   ```

7. Verify container state and API readiness:

   ```sh
   docker compose --env-file .env -f compose.release.yaml ps
   docker compose --env-file .env -f compose.release.yaml exec api python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/v1/health/ready').read().decode())"
   ```

The web port is bound to `127.0.0.1` deliberately. Configure HTTPS and request-size limits in the
host reverse proxy. Never expose PostgreSQL, Redis, or the model service directly to the internet.

## Upgrade

1. Create and verify a database backup.
2. Read `CHANGELOG.md` and pull/checkout the desired tag.
3. Validate the new Compose configuration.
4. Build images before replacing containers:

   ```sh
   docker compose --env-file .env -f compose.release.yaml build
   ```

5. Apply the release. The API container runs forward-only Alembic migrations before startup:

   ```sh
   docker compose --env-file .env -f compose.release.yaml up --detach
   ```

6. Check `ps`, API readiness, and application behavior. Database rollback is a restore operation;
   do not run Alembic downgrade casually on production data.

## Backup and restore

PowerShell backup:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup.ps1
```

This creates a timestamped SQL file and SHA-256 checksum under `backups/` by default. Copy backups
to encrypted storage outside the Atlas host and test restores regularly. The script covers
PostgreSQL; separately back up externally mounted model checkpoints and future object storage.

Restore is destructive and requires an explicit switch:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupFile .\backups\atlas-postgres-YYYYMMDD-HHMMSS.sql -ConfirmRestore
```

Stop user traffic before restoring. Restore into a staging instance first when possible, then run
readiness checks and verify representative records.

## Release artifacts

`scripts/build-release.ps1` runs verification and produces a versioned source ZIP plus SHA-256
checksum under `release/`. Pass `-BuildWindowsInstaller` only when the desktop model prerequisites
are prepared. Tagged GitHub releases run CI, build source/Windows artifacts, and publish versioned
API, web, and model images to GitHub Container Registry.

## Known operational boundaries

- Authentication endpoints exist, but the React sign-in UI and durable workspace repositories are
  not wired in 0.1.0.
- The browser build does not yet expose Atlas Native chat; desktop is the active Chat client.
- No Atlas-owned image checkpoint exists.
- Background jobs/object storage are not implemented, so remote file/image workflows are disabled.
