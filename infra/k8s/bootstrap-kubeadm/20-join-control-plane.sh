#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

JOIN_CMD="${JOIN_CMD:-}"

if [[ -z "${JOIN_CMD}" ]]; then
  echo "Usage: sudo JOIN_CMD=\"$(cat /root/join-control-plane.sh)\" $0" >&2
  exit 1
fi

if [[ ! -f /etc/kubernetes/manifests/kube-vip.yaml ]]; then
  echo "Missing /etc/kubernetes/manifests/kube-vip.yaml on this node." >&2
  echo "Copy kube-vip manifest from first control-plane before join." >&2
  exit 1
fi

echo "[1/2] Join control-plane..."
bash -lc "${JOIN_CMD}"

echo "[2/2] Configure kubectl for root..."
mkdir -p /root/.kube
cp -f /etc/kubernetes/admin.conf /root/.kube/config
chmod 600 /root/.kube/config

echo "Done."
