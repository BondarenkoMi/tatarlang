#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/helm/monitoring/.env"

for cmd in kubectl helm helmfile openssl; do
  command -v "$cmd" >/dev/null || { echo "Не найден $cmd" >&2; exit 1; }
done

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
GRAFANA_SMTP_ENABLED=false
GRAFANA_SMTP_HOST=smtp.example.com:587
GRAFANA_SMTP_USER=
GRAFANA_SMTP_PASSWORD=
GRAFANA_SMTP_FROM_ADDRESS=
GRAFANA_ALERT_EMAIL=
EOF
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${GRAFANA_ADMIN_USER:?Заполните GRAFANA_ADMIN_USER в helm/monitoring/.env}"
: "${GRAFANA_ADMIN_PASSWORD:?Заполните GRAFANA_ADMIN_PASSWORD в helm/monitoring/.env}"

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create secret generic grafana-admin -n monitoring \
  --from-literal=admin-user="$GRAFANA_ADMIN_USER" \
  --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

if [ "${GRAFANA_SMTP_ENABLED:-false}" = true ]; then
  : "${GRAFANA_SMTP_HOST:?Заполните GRAFANA_SMTP_HOST}"
  : "${GRAFANA_SMTP_USER:?Заполните GRAFANA_SMTP_USER}"
  : "${GRAFANA_SMTP_PASSWORD:?Заполните GRAFANA_SMTP_PASSWORD}"
  : "${GRAFANA_SMTP_FROM_ADDRESS:?Заполните GRAFANA_SMTP_FROM_ADDRESS}"
  : "${GRAFANA_ALERT_EMAIL:?Заполните GRAFANA_ALERT_EMAIL}"
  kubectl create secret generic grafana-smtp -n monitoring \
    --from-literal=user="$GRAFANA_SMTP_USER" \
    --from-literal=password="$GRAFANA_SMTP_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
fi

cd "$ROOT_DIR"
helmfile sync

echo "Мониторинг развёрнут. Логин Grafana хранится только в helm/monitoring/.env (mode 600)."
