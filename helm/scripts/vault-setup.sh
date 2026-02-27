#!/bin/bash
# =============================================================================
# vault-setup.sh — настройка Vault для TatarEdu
# Создаёт: secrets engine, секреты, политику, AppRole
#
# Запуск: bash helm/scripts/vault-setup.sh
# Требует: kubectl, настроенный kubeconfig, запущенный vault pod
# =============================================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

VAULT_NAMESPACE=vault
VAULT_POD=vault-0

echo -e "${YELLOW}=== TatarEdu Vault Setup ===${NC}"

kubectl wait --for=condition=ready pod/$VAULT_POD -n $VAULT_NAMESPACE --timeout=60s

kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c '
export VAULT_TOKEN=root
export VAULT_ADDR=http://127.0.0.1:8200

echo "=== [1/5] Включаем KV v2 secrets engine ==="
vault secrets enable -path=secret kv-v2 2>/dev/null || echo "Already enabled"

echo ""
echo "=== [2/5] Создаём секреты приложения ==="
vault kv put secret/tataredu/postgres \
  user=postgres \
  password=postgres \
  database=tatarlang

vault kv put secret/tataredu/rabbitmq \
  user=admin \
  password=admin

vault kv put secret/tataredu/django \
  secret_key="django-insecure-change-me-in-production"

vault kv put secret/tataredu/redis \
  password=redis-secret-password

echo "Секреты созданы"

echo ""
echo "=== [3/5] Создаём политики ==="
vault policy write tataredu-policy - <<EOF
path "secret/data/tataredu/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/tataredu/*" {
  capabilities = ["read", "list"]
}
EOF

vault policy write rabbitmq-policy - <<EOF
path "secret/data/tataredu/rabbitmq" {
  capabilities = ["read", "list"]
}
path "secret/metadata/tataredu/rabbitmq" {
  capabilities = ["read", "list"]
}
EOF

vault policy write redis-policy - <<EOF
path "secret/data/tataredu/redis" {
  capabilities = ["read", "list"]
}
path "secret/metadata/tataredu/redis" {
  capabilities = ["read", "list"]
}
EOF
echo "Политики созданы"

echo ""
echo "=== [4/5] Включаем AppRole auth ==="
vault auth enable approle 2>/dev/null || echo "Already enabled"

echo ""
echo "=== [5/5] Создаём AppRole роль (tataredu-policy + rabbitmq-policy + redis-policy) ==="
vault write auth/approle/role/tataredu-role \
  token_policies="tataredu-policy,rabbitmq-policy,redis-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=24h

ROLE_ID=$(vault read -field=role_id auth/approle/role/tataredu-role/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/tataredu-role/secret-id)

echo ""
echo "=== AppRole Credentials ==="
echo "VAULT_ROLE_ID=$ROLE_ID"
echo "VAULT_SECRET_ID=$SECRET_ID"
'

echo -e "${GREEN}=== Vault настроен успешно ===${NC}"
