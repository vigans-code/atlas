#!/usr/bin/env sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
command -v python3 >/dev/null 2>&1 || { echo "Python 3.12+ is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Node.js 22+ and npm are required." >&2; exit 1; }

python3 -c 'import sys; assert sys.version_info >= (3, 12), "Python 3.12+ is required"'
python3 -m venv "$repo_dir/backend/.venv"
"$repo_dir/backend/.venv/bin/python" -m pip install --upgrade pip
"$repo_dir/backend/.venv/bin/python" -m pip install -e "$repo_dir/backend[dev]"

python3 -m venv "$repo_dir/model/.venv"
"$repo_dir/model/.venv/bin/python" -m pip install --upgrade pip
"$repo_dir/model/.venv/bin/python" -m pip install -e "$repo_dir/model[dev]"

(cd "$repo_dir/frontend" && npm ci)
echo "Atlas dependencies installed. Run scripts/verify.sh next."
