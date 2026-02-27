
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

VAULT_NAMESPACE=vault
VAULT_POD=vault-0

echo -e "${YELLOW}=== Vault Init & Unseal ===${NC}"

# Ждём готовности пода
kubectl wait --for=condition=ready pod/$VAULT_POD -n $VAULT_NAMESPACE --timeout=120s

# Проверяем инициализирован ли vault
INIT_STATUS=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault status -format=json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('initialized','false'))" 2>/dev/null || echo "false")

if [ "$INIT_STATUS" = "True" ]; then
  echo -e "${YELLOW}Vault уже инициализирован.${NC}"
else
  echo "Инициализируем Vault (5 unseal keys, threshold=3)..."
  INIT_OUTPUT=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator init \
    -key-shares=5 \
    -key-threshold=3 \
    -format=json 2>&1)

  # Сохраняем ключи в файл (НЕ коммитить в git!)
  echo "$INIT_OUTPUT" > /tmp/vault-init-keys.json
  echo -e "${RED}ВНИМАНИЕ: Unseal keys сохранены в /tmp/vault-init-keys.json${NC}"
  echo -e "${RED}         Сохрани их в безопасном месте и УДАЛИ из /tmp!${NC}"

  ROOT_TOKEN=$(echo "$INIT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")
  echo -e "${GREEN}Root Token: $ROOT_TOKEN${NC}"

  # Unseal с первыми 3 ключами
  for i in 0 1 2; do
    UNSEAL_KEY=$(echo "$INIT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['unseal_keys_b64'][$i])")
    kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator unseal "$UNSEAL_KEY"
  done

  echo -e "${GREEN}Vault инициализирован и распечатан!${NC}"
  echo "Установите: export VAULT_TOKEN=$ROOT_TOKEN"
fi
