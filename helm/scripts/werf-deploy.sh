#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HELM_DIR/.." && pwd)"
CHART_DIR="$PROJECT_DIR/.helm"
SECRET_SOURCE="$HELM_DIR/secrets.yaml"
GENERATED_VALUES="$CHART_DIR/values.yaml"

if [ -f "$HELM_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$HELM_DIR/.env"
  set +a
fi

NAMESPACE="${NAMESPACE:-tataredu}"
RELEASE_NAME="${RELEASE_NAME:-tataredu}"
WERF_ENV="${WERF_ENV:-local}"
DEMO_MODE="${DEMO_MODE:-false}"
export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-tataredu}"
VAULT_SERVICE="${VAULT_SERVICE:-vault}"
MODE=converge

if [ "${1:-}" = "--render-only" ]; then
  MODE=render
elif [ "$#" -gt 0 ]; then
  echo "Использование: $0 [--render-only]" >&2
  exit 1
fi

for cmd in werf vals kubectl curl; do
  command -v "$cmd" >/dev/null || { echo "Не найден $cmd" >&2; exit 1; }
done

PF_PID=""
TEMP_VALUES=""
WERF_HELM_PLUGINS_DIR="$(mktemp -d)"
cleanup() {
  if [ -n "$TEMP_VALUES" ]; then rm -f "$TEMP_VALUES"; fi
  rm -f "$GENERATED_VALUES"
  rm -rf "$WERF_HELM_PLUGINS_DIR"
  if [ -n "$PF_PID" ]; then kill "$PF_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

# The locally installed helm-secrets plugin targets Helm 4, while werf embeds
# its own Helm-compatible engine. Keep werf's plugin directory isolated.
export HELM_PLUGINS="$WERF_HELM_PLUGINS_DIR"

if ! curl -sf --max-time 3 "$VAULT_ADDR/v1/sys/health" >/dev/null; then
  kubectl port-forward -n "$VAULT_NAMESPACE" "svc/$VAULT_SERVICE" 8200:8200 >/dev/null 2>&1 &
  PF_PID=$!
  for _ in {1..20}; do
    curl -sf --max-time 2 "$VAULT_ADDR/v1/sys/health" >/dev/null && break
    sleep 1
  done
  curl -sf --max-time 3 "$VAULT_ADDR/v1/sys/health" >/dev/null
fi

# vals replaces ref+vault links. Write atomically so a failed evaluation never
# leaves a partially generated secrets file in the chart.
TEMP_VALUES="$(mktemp "$CHART_DIR/.values.yaml.XXXXXX")"
vals eval -f "$SECRET_SOURCE" >"$TEMP_VALUES"
if grep -q 'ref+vault://' "$TEMP_VALUES"; then
  echo "vals оставил неразрешённые Vault-ссылки" >&2
  exit 1
fi
mv "$TEMP_VALUES" "$GENERATED_VALUES"
TEMP_VALUES=""

HELM_VALUES=(
  --values "$CHART_DIR/values-common.yaml"
)
if [ "$DEMO_MODE" = true ]; then
  HELM_VALUES+=(--values "$CHART_DIR/values-demo.yaml")
  echo "Demo profile: Flower, Celery worker/beat and RedisInsight are disabled."
fi
HELM_VALUES+=(--values "$GENERATED_VALUES")

cd "$PROJECT_DIR"
if [ "$MODE" = render ]; then
  werf render \
    --dev \
    --without-images \
    --env "$WERF_ENV" \
    --release "$RELEASE_NAME" \
    --namespace "$NAMESPACE" \
    "${HELM_VALUES[@]}" >/dev/null
  echo "Render успешен; временный .helm/values.yaml будет удалён."
  exit 0
fi

for cmd in docker; do
  command -v "$cmd" >/dev/null || { echo "Не найден $cmd" >&2; exit 1; }
done
: "${DOCKERHUB_USERNAME:?Укажите DOCKERHUB_USERNAME в helm/.env}"
: "${DOCKERHUB_TOKEN:?Укажите DOCKERHUB_TOKEN в helm/.env}"
WERF_REPO="${WERF_REPO:-docker.io/$DOCKERHUB_USERNAME/tataredu}"

printf '%s' "$DOCKERHUB_TOKEN" | docker login docker.io \
  --username "$DOCKERHUB_USERNAME" --password-stdin >/dev/null

werf converge \
  --dev \
  --repo "$WERF_REPO" \
  --env "$WERF_ENV" \
  --release "$RELEASE_NAME" \
  --namespace "$NAMESPACE" \
  "${HELM_VALUES[@]}" \
  --auto-rollback \
  --timeout 600

kubectl get pods -n "$NAMESPACE"
