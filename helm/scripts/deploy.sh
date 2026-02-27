
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

# Загружаем .env если он есть
if [ -f "helm/.env" ]; then
  set -o allexport
  source helm/.env
  set +o allexport
fi

# Параметры с дефолтами из .env
NAMESPACE="${NAMESPACE:-tataredu}"
RELEASE_NAME="${RELEASE_NAME:-tataredu}"
VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
DRY_RUN=""

# Обработка аргументов
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN="--dry-run=client" ;;
  esac
done

echo -e "${YELLOW}=== TatarEdu Deploy ===${NC}"
echo "  Release:   $RELEASE_NAME"
echo "  Namespace: $NAMESPACE"
echo "  Vault:     $VAULT_ADDR"
[ -n "$DRY_RUN" ] && echo -e "  ${YELLOW}[DRY RUN]${NC}"

# Проверяем зависимости
for cmd in helm vals kubectl; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "${RED}Ошибка: $cmd не найден${NC}"
    exit 1
  fi
done

# --- Port-forward к vault если нужен ---
# Если vault не доступен напрямую, поднимаем port-forward
if ! curl -sf "${VAULT_ADDR}/v1/sys/health" &>/dev/null; then
  echo -e "${YELLOW}Поднимаем port-forward к Vault...${NC}"
  kubectl port-forward -n vault svc/vault 8200:8200 &
  PF_PID=$!
  trap "kill $PF_PID 2>/dev/null" EXIT
  sleep 3
fi

# --- Обновляем helm dependencies ---
echo -e "\n${YELLOW}[1/3] Обновляем helm dependencies...${NC}"
helm dependency update helm/tataredu

# --- Разрешаем vault-refs и деплоим ---
echo -e "\n${YELLOW}[2/3] Разрешаем секреты из Vault (vals)...${NC}"
echo -e "\n${YELLOW}[3/3] Деплой helm-чарта...${NC}"

# vals eval читает secrets.yaml, заменяет ref+vault://... на реальные значения,
# выводит YAML в stdout → helm принимает через -f -
vals eval -f helm/secrets.yaml | \
  helm upgrade --install "$RELEASE_NAME" helm/tataredu \
    --namespace "$NAMESPACE" \
    --create-namespace \
    $DRY_RUN \
    -f helm/tataredu/values.yaml \
    -f -

echo -e "\n${GREEN}=== Деплой завершён! ===${NC}"
echo ""
echo "Статус подов:"
kubectl get pods -n "$NAMESPACE"
