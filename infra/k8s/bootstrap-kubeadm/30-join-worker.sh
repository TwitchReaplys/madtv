#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

JOIN_CMD="${JOIN_CMD:-}"

if [[ -z "${JOIN_CMD}" ]]; then
  echo "Usage: sudo JOIN_CMD=\"$(cat /root/join-worker.sh)\" $0" >&2
  exit 1
fi

echo "[1/1] Join worker node..."
bash -lc "${JOIN_CMD}"

echo "Done."
