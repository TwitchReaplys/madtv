#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

VIP="${VIP:-}"
INTERFACE="${INTERFACE:-}"
POD_CIDR="${POD_CIDR:-10.244.0.0/16}"
KVVERSION="${KVVERSION:-v0.8.10}"
ADVERTISE_ADDRESS="${ADVERTISE_ADDRESS:-}"

if [[ -z "${VIP}" || -z "${INTERFACE}" ]]; then
  echo "Usage: sudo VIP=<api-vip> INTERFACE=<nic> [ADVERTISE_ADDRESS=<node-ip>] [POD_CIDR=10.244.0.0/16] [KVVERSION=v0.8.10] $0" >&2
  exit 1
fi

if ! ip link show "${INTERFACE}" >/dev/null 2>&1; then
  echo "Network interface '${INTERFACE}' does not exist on this host." >&2
  exit 1
fi

if [[ -z "${ADVERTISE_ADDRESS}" ]]; then
  ADVERTISE_ADDRESS="$(ip -4 -o addr show dev "${INTERFACE}" | awk '{split($4,a,"/"); print a[1]; exit}')"
fi

if [[ -z "${ADVERTISE_ADDRESS}" ]]; then
  echo "Cannot determine ADVERTISE_ADDRESS from interface '${INTERFACE}'." >&2
  echo "Pass it explicitly, for example ADVERTISE_ADDRESS=10.40.0.11" >&2
  exit 1
fi

echo "[1/5] Prepare kube-vip static pod manifest..."
mkdir -p /etc/kubernetes/manifests
ctr image pull "ghcr.io/kube-vip/kube-vip:${KVVERSION}" >/dev/null
ctr run --rm --net-host "ghcr.io/kube-vip/kube-vip:${KVVERSION}" vip \
  /kube-vip manifest pod \
  --interface "${INTERFACE}" \
  --address "${VIP}" \
  --controlplane \
  --arp \
  --leaderElection \
  >/etc/kubernetes/manifests/kube-vip.yaml

echo "[2/5] kubeadm init..."
kubeadm init \
  --apiserver-advertise-address "${ADVERTISE_ADDRESS}" \
  --control-plane-endpoint "${VIP}:6443" \
  --upload-certs \
  --pod-network-cidr "${POD_CIDR}"

echo "[3/5] Configure kubectl for current user and root..."
mkdir -p "${HOME}/.kube"
cp -f /etc/kubernetes/admin.conf "${HOME}/.kube/config"
chmod 600 "${HOME}/.kube/config"
mkdir -p /root/.kube
cp -f /etc/kubernetes/admin.conf /root/.kube/config
chmod 600 /root/.kube/config

echo "[4/5] Generate join commands..."
BASE_JOIN="$(kubeadm token create --print-join-command)"
CERT_KEY="$(kubeadm init phase upload-certs --upload-certs | tail -n1)"
echo "${BASE_JOIN}" >/root/join-worker.sh
echo "${BASE_JOIN} --control-plane --certificate-key ${CERT_KEY}" >/root/join-control-plane.sh
chmod 700 /root/join-worker.sh /root/join-control-plane.sh

echo "[5/5] Done."
echo "Control-plane join command:"
cat /root/join-control-plane.sh
echo
echo "Worker join command:"
cat /root/join-worker.sh
echo
echo "IMPORTANT: install a CNI plugin next (Calico/Cilium/...)."
