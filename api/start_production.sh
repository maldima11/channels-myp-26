#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
source .venv/bin/activate
exec gunicorn --config gunicorn.conf.py app:app
