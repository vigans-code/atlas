#!/usr/bin/env sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
"$repo_dir/backend/.venv/bin/python" -m ruff check "$repo_dir/backend/app" "$repo_dir/backend/tests"
"$repo_dir/backend/.venv/bin/python" -m ruff format --check "$repo_dir/backend/app" "$repo_dir/backend/tests"
"$repo_dir/backend/.venv/bin/python" -m pytest -q "$repo_dir/backend/tests"
"$repo_dir/model/.venv/bin/python" -m ruff check "$repo_dir/model/atlas_model" "$repo_dir/model/tests"
"$repo_dir/model/.venv/bin/python" -m ruff format --check "$repo_dir/model/atlas_model" "$repo_dir/model/tests"
"$repo_dir/model/.venv/bin/python" -m pytest -q "$repo_dir/model/tests"
(cd "$repo_dir/frontend" && npm run lint && npm run test && npm run test:security && npm run build)

if command -v docker >/dev/null 2>&1; then
  docker compose -f "$repo_dir/compose.yaml" config --quiet
  docker compose --env-file "$repo_dir/.env.production.example" -f "$repo_dir/compose.release.yaml" config --quiet
fi
echo "Atlas verification passed."
