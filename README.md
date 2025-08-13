# E-Commerce DevOps Practice (Ansible + Helm + Prometheus + Grafana)

This is a **hands-on practice project** to deploy a simple e-commerce-like stack on Kubernetes with:
- **Ansible** for automation
- **Helm** charts for app deployment (frontend, backend, database)
- **Prometheus** for metrics (via kube-prometheus-stack)
- **Grafana** for dashboards

## Architecture
```
Users → Ingress/Service → Frontend → Backend (Node.js) → MySQL
                                  ↘ /metrics → Prometheus → Grafana
```
- Backend exposes `/metrics` using `prom-client`.
- A `ServiceMonitor` (from kube-prometheus-stack) scrapes the backend.
- Frontend is a static site that calls the backend service.

## Prereqs (local dev with Minikube recommended)
- Linux or WSL2
- Python3 + Ansible (`pip install ansible`)
- Docker
- Minikube
- kubectl, Helm (Ansible playbook can install kubectl+Helm if you prefer)

## Quick Start (Local Minikube)
```bash
# 0) Optional: let Docker build into Minikube daemon
minikube start --cpus=4 --memory=6g
eval $(minikube -p minikube docker-env)

# 1) Build images locally
docker build -t ecommerce-backend:1.0 ./src/backend
docker build -t ecommerce-frontend:1.0 ./src/frontend

# 2) Install Python deps and run Ansible
python3 -m pip install --user ansible
ansible-playbook -i ansible/inventory ansible/setup_k8s.yml

# 3) Deploy the app via Helm (Ansible playbook)
ansible-playbook ansible/deploy_app.yml

# 4) Access services
minikube service ecommerce-frontend -n ecommerce
# Prometheus
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
# Grafana
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
# Login grafana: admin / prom-operator
```

### Notes
- If you don't build local images, set proper image repos/tags in `helm/*/values.yaml` and ensure nodes can pull them.
- Ingress optional: enable via `minikube addons enable ingress` and set `frontend.ingress.enabled=true`.

## Cleanup
```bash
helm -n ecommerce uninstall ecommerce || true
kubectl delete ns ecommerce || true
helm -n monitoring uninstall monitoring || true
kubectl delete ns monitoring || true
minikube delete
```

Good luck & happy shipping! 🚀
