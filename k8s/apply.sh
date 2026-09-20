#!/bin/bash
# Скрипт деплоя TatarEdu в Minikube
# Использование: bash k8s/apply.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
for file in k8s/secret.local.yaml k8s/tls-secret.local.yaml; do
  [ -f "$file" ] || { echo "Подготовьте $file по примеру в k8s/" >&2; exit 1; }
done
NAMESPACE=tataredu
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}=== TatarEdu K8s Deployment ===${NC}"

# --- 1. Сборка образов внутри Docker-демона Minikube ---
echo -e "\n${YELLOW}[1/6] Building Docker images in Minikube context...${NC}"
eval "$(minikube docker-env)"
docker build -t tataredu/backend:latest ./backend
docker build -t tataredu/frontend:latest ./frontend
echo -e "${GREEN}Images built.${NC}"

# --- 2. Базовые абстракции ---
echo -e "\n${YELLOW}[2/6] Applying Namespace, ConfigMap, Secret...${NC}"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.local.yaml
kubectl apply -f k8s/tls-secret.local.yaml

# --- 3. База данных ---
echo -e "\n${YELLOW}[3/6] Applying PostgreSQL (PV, PVC, StatefulSet)...${NC}"
kubectl apply -f k8s/postgres-pv.yaml
kubectl apply -f k8s/postgres.yaml
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s

# --- 4. RabbitMQ ---
echo -e "\n${YELLOW}[4/6] Applying RabbitMQ...${NC}"
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/media-pvc.yaml
echo "Waiting for RabbitMQ to be ready..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n $NAMESPACE --timeout=120s

# --- 5. Миграции ---
echo -e "\n${YELLOW}[5/6] Running Django migrations (Job)...${NC}"
# Удалить предыдущий job если существует
kubectl delete job django-migrate -n $NAMESPACE --ignore-not-found
kubectl apply -f k8s/migrate-job.yaml
echo "Waiting for migrations to complete..."
kubectl wait --for=condition=complete job/django-migrate -n $NAMESPACE --timeout=120s

# --- 6. Основные сервисы ---
echo -e "\n${YELLOW}[6/6] Applying all services...${NC}"
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/celery-worker.yaml
kubectl apply -f k8s/celery-beat.yaml
kubectl apply -f k8s/celery-flower.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/cron-clearsessions.yaml
kubectl apply -f k8s/ingress.yaml

# --- Итог ---
MINIKUBE_IP=$(minikube ip)
echo -e "\n${GREEN}=== Deployment complete! ===${NC}"
echo -e "Minikube IP: ${GREEN}${MINIKUBE_IP}${NC}"
echo ""
echo "Добавьте в /etc/hosts (нужен sudo):"
echo -e "  ${YELLOW}echo '${MINIKUBE_IP}  tataredu.test' | sudo tee -a /etc/hosts${NC}"
echo ""
echo "Запустите туннель в отдельном терминале:"
echo -e "  ${YELLOW}minikube tunnel${NC}"
echo ""
echo "Доступ:"
echo -e "  Frontend:  ${GREEN}https://tataredu.test${NC}"
echo -e "  API:       ${GREEN}https://tataredu.test/api/v1/${NC}"
echo -e "  Swagger:   ${GREEN}https://tataredu.test/swagger/${NC}"
echo -e "  Flower:    ${GREEN}https://tataredu.test/flower${NC}"
echo ""
echo "Статус подов:"
kubectl get pods -n $NAMESPACE
