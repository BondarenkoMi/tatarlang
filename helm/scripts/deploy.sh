#!/usr/bin/env bash
set -euo pipefail
umask 077
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHART_DIR="$HELM_DIR/tataredu"
if [ -f "$HELM_DIR/.env" ]; then
  set -a
  source "$HELM_DIR/.env"
  set +a
fi
NAMESPACE="${NAMESPACE:-tataredu}"
RELEASE_NAME="${RELEASE_NAME:-tataredu}"
export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-tataredu}"
VAULT_SERVICE="${VAULT_SERVICE:-vault}"
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 1 ;;
  esac
done
for cmd in helm vals kubectl curl; do
  command -v "$cmd" >/dev/null || { echo "Не найден $cmd" >&2; exit 1; }
done
helm secrets --version >/dev/null 2>&1 || {
  echo "helm-secrets не установлен или несовместим с текущей версией Helm" >&2
  exit 1
}

PF_PID=""
cleanup() {
  if [ -n "$PF_PID" ]; then kill "$PF_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT
if ! curl -sf --max-time 3 "$VAULT_ADDR/v1/sys/health" >/dev/null; then
  kubectl port-forward -n "$VAULT_NAMESPACE" "svc/$VAULT_SERVICE" 8200:8200 >/dev/null 2>&1 &
  PF_PID=$!
  for attempt in {1..20}; do
    if curl -sf --max-time 2 "$VAULT_ADDR/v1/sys/health" >/dev/null; then break; fi
    sleep 1
  done
  curl -sf --max-time 3 "$VAULT_ADDR/v1/sys/health" >/dev/null
fi

helm dependency build "$CHART_DIR" --skip-refresh
if [ "$DRY_RUN" = true ]; then
  # helm-secrets передаёт файл backend-у vals и удаляет временную расшифрованную копию.
  helm secrets --backend vals template "$RELEASE_NAME" "$CHART_DIR" \
    --namespace "$NAMESPACE" -f "$HELM_DIR/secrets.yaml" >/dev/null
  echo "Dry run: helm-secrets + vals получили секреты из Vault и отрендерили chart."
  exit 0
fi
# Сохраняем поддержку namespace, ранее созданного обычными манифестами.
if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
  owner=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}')
  if [ -n "$owner" ] && [ "$owner" != "$RELEASE_NAME" ]; then
    echo "Namespace принадлежит другому Helm-релизу: $owner" >&2
    exit 1
  fi
else
  kubectl create namespace "$NAMESPACE"
fi
kubectl label namespace "$NAMESPACE" app.kubernetes.io/managed-by=Helm --overwrite
kubectl annotate namespace "$NAMESPACE" meta.helm.sh/release-name="$RELEASE_NAME" meta.helm.sh/release-namespace="$NAMESPACE" --overwrite
helm secrets --backend vals upgrade --install "$RELEASE_NAME" "$CHART_DIR" \
  --namespace "$NAMESPACE" --create-namespace -f "$HELM_DIR/secrets.yaml" \
  --reset-values --rollback-on-failure --wait --timeout 5m

# envFrom не меняет pod template при обновлении Secret/ConfigMap. Перезапускаем только
# прикладные процессы, чтобы они гарантированно получили новые env и локальные images.
APP_DEPLOYMENTS=(backend frontend celery-worker celery-beat celery-flower)
for component in "${APP_DEPLOYMENTS[@]}"; do
  kubectl rollout restart deployment/"$RELEASE_NAME-$component" -n "$NAMESPACE"
done
for component in "${APP_DEPLOYMENTS[@]}"; do
  kubectl rollout status deployment/"$RELEASE_NAME-$component" -n "$NAMESPACE" --timeout=5m
done
kubectl get pods -n "$NAMESPACE"
