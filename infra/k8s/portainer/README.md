# MadTV on Kubernetes via Portainer

Tento adresář obsahuje základní Kubernetes stack pro:
- `web` (Next.js app)
- `worker` (BullMQ worker)
- `redis` (queue backend)

Soubor stacku:
- `infra/k8s/portainer/stack.yaml`

## 1) Napojení clusteru do Portaineru

Pokud Portainer běží mimo cluster:
1. V Portainer UI otevři `Environments -> Add environment -> Kubernetes`.
2. Zvol `Agent`.
3. Portainer ti vygeneruje manifest nebo command pro nasazení agenta.
4. Ten aplikuj na cluster (`kubectl apply -f ...`).

Pokud Portainer běží přímo v tom clusteru, environment už bývá dostupný automaticky.

## 2) Build a push image

Použij vlastní registry namespace a tag:

```bash
docker build -f apps/web/Dockerfile -t ghcr.io/<org>/madtv-web:<tag> .
docker push ghcr.io/<org>/madtv-web:<tag>

docker build -f apps/worker/Dockerfile -t ghcr.io/<org>/madtv-worker:<tag> .
docker push ghcr.io/<org>/madtv-worker:<tag>
```

Pak v `stack.yaml` přepiš image:
- `ghcr.io/your-org/madtv-web:latest`
- `ghcr.io/your-org/madtv-worker:latest`

## 3) Vyplnění konfigurace

Ve `stack.yaml` uprav minimálně:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BUNNY_STREAM_*` (pokud používáš Bunny)
- host/TLS v `Ingress` (`madtv.example.com`, `madtv-tls`)

## 4) Deploy přes Portainer

1. `Stacks -> Add stack`.
2. Vyber `Kubernetes`.
3. Nahraj obsah `infra/k8s/portainer/stack.yaml` (nebo Git repo + path).
4. `Deploy the stack`.

## 5) Ověření

```bash
kubectl -n madtv get pods -o wide
kubectl -n madtv get svc
kubectl -n madtv get ingress
kubectl -n madtv logs deploy/worker --tail=100
```

Health check webu:

```bash
curl -fsS https://<tvoje-domena>/api/health
```

## 6) Poznámky pro produkci

- Pokud registry vyžaduje auth, vytvoř `imagePullSecret` v namespace `madtv` a doplň ho do deploymentů.
- Redis je zde v základní single-instance variantě (MVP). Pro vyšší HA nasadit Redis Sentinel/Operator.
- `worker` může běžet ve více replikách, job processing je přes BullMQ distribuovaný.
