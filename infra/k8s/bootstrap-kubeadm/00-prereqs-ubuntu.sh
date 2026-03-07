#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

K8S_MINOR="${K8S_MINOR:-v1.35}"

echo "[1/7] Disable swap..."
swapoff -a
sed -ri 's@^([^#].*\sswap\s+.*)$@# \1@g' /etc/fstab

echo "[2/7] Kernel modules..."
cat >/etc/modules-load.d/k8s.conf <<'EOF'
overlay
br_netfilter
EOF
modprobe overlay
modprobe br_netfilter

echo "[3/7] Sysctl..."
cat >/etc/sysctl.d/k8s.conf <<'EOF'
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system >/dev/null

echo "[4/7] Base packages..."
apt-get update -y
apt-get install -y ca-certificates curl gpg apt-transport-https

echo "[5/7] Install containerd..."
apt-get install -y containerd
mkdir -p /etc/containerd
containerd config default >/etc/containerd/config.toml
sed -ri 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sed -ri 's@^\s*disabled_plugins\s*=.*@disabled_plugins = []@' /etc/containerd/config.toml || true
systemctl enable --now containerd
systemctl restart containerd

echo "[6/7] Install kubeadm/kubelet/kubectl from pkgs.k8s.io (${K8S_MINOR})..."
mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL "https://pkgs.k8s.io/core:/stable:/${K8S_MINOR}/deb/Release.key" \
  | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/${K8S_MINOR}/deb/ /" \
  >/etc/apt/sources.list.d/kubernetes.list

apt-get update -y
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
systemctl enable kubelet

echo "[7/7] Done."
echo "Next: run 10-init-first-control-plane.sh on first control-plane node."
