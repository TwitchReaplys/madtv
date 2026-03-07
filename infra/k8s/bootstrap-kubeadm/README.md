# Kubernetes (kubeadm) + kube-vip Bootstrap (Ubuntu)

Tento bootstrap je pro:
- 3 fyzické Ubuntu nody
- Kubernetes přes `kubeadm` (ne k3s)
- HA API endpoint přes `kube-vip` (ARP)
- containerd jako runtime

## Topologie

- `cp-1` (control-plane)
- `cp-2` (control-plane)
- `cp-3` (control-plane)
- API VIP např. `192.168.10.50`
- Interface pro ARP např. `eno1`

Poznámka: ARP mód vyžaduje L2 sousedství (stejná síť/VLAN).

## Soubory

- `00-prereqs-ubuntu.sh` - spustit na všech nodech
- `10-init-first-control-plane.sh` - pouze na `cp-1`
- `20-join-control-plane.sh` - na `cp-2`, `cp-3`
- `30-join-worker.sh` - pro worker nody (pokud přidáš)

## 1) Prereqs na všech nodech

```bash
cd infra/k8s/bootstrap-kubeadm
sudo K8S_MINOR=v1.35 ./00-prereqs-ubuntu.sh
```

## 2) Init prvního control-plane (`cp-1`)

```bash
cd infra/k8s/bootstrap-kubeadm
sudo VIP=192.168.10.50 INTERFACE=eno1 POD_CIDR=10.244.0.0/16 ./10-init-first-control-plane.sh
```

Po dokončení:
- vznikne `/etc/kubernetes/manifests/kube-vip.yaml`
- vzniknou soubory:
  - `/root/join-control-plane.sh`
  - `/root/join-worker.sh`

## 3) Zkopíruj kube-vip manifest na ostatní control-plane

Na `cp-1`:

```bash
sudo scp /etc/kubernetes/manifests/kube-vip.yaml root@cp-2:/etc/kubernetes/manifests/kube-vip.yaml
sudo scp /etc/kubernetes/manifests/kube-vip.yaml root@cp-3:/etc/kubernetes/manifests/kube-vip.yaml
```

## 4) Join dalších control-plane (`cp-2`, `cp-3`)

Na `cp-1`:

```bash
sudo scp /root/join-control-plane.sh root@cp-2:/root/join-control-plane.sh
sudo scp /root/join-control-plane.sh root@cp-3:/root/join-control-plane.sh
```

Na `cp-2` a `cp-3`:

```bash
cd infra/k8s/bootstrap-kubeadm
sudo JOIN_CMD="$(cat /root/join-control-plane.sh)" ./20-join-control-plane.sh
```

## 5) (Volitelné) Join worker nodů

Na `cp-1`:

```bash
sudo scp /root/join-worker.sh root@worker-1:/root/join-worker.sh
```

Na worker node:

```bash
cd infra/k8s/bootstrap-kubeadm
sudo JOIN_CMD="$(cat /root/join-worker.sh)" ./30-join-worker.sh
```

## 6) Ověření clusteru

Na `cp-1`:

```bash
kubectl get nodes -o wide
kubectl -n kube-system get pods -o wide
```

## 7) CNI plugin (nutné)

Po `kubeadm init/join` ještě nainstaluj CNI (Calico/Cilium/…).
Bez CNI budou nody ve stavu `NotReady`.

## 8) Další doporučení pro produkci

- nasadit `ingress-nginx` nebo `traefik`
- nasadit `cert-manager`
- přidat monitoring + alerting
- pravidelně testovat `kubeadm` upgrade postup

## Reset node (když se bootstrap nepovede)

```bash
sudo kubeadm reset -f
sudo rm -rf /etc/cni/net.d /etc/kubernetes /var/lib/etcd /var/lib/kubelet/pki
sudo systemctl restart containerd kubelet
```

## Zdroje

- Kubernetes kubeadm install: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes HA with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- kube-vip static pods (kubeadm flow): https://kube-vip.io/docs/installation/static/
