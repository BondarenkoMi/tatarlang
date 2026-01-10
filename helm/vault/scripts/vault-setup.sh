#!/bin/bash

# Скрипт для настройки Vault: движок секретов, политики, AppRole
# Использование: ./scripts/vault-setup.sh

set -e

VAULT_NAMESPACE=${VAULT_NAMESPACE:-vault}
VAULT_POD=$(kubectl get pods -n $VAULT_NAMESPACE -l app.kubernetes.io/name=vault -o jsonpath='{.items[0].metadata.name}')

if [ -z "$VAULT_POD" ]; then
    echo "❌ Vault pod не найден в namespace $VAULT_NAMESPACE"
    exit 1
fi

# Получить root token
if [ -f /tmp/vault-root-token.txt ]; then
    ROOT_TOKEN=$(cat /tmp/vault-root-token.txt)
else
    read -sp "Введите root token: " ROOT_TOKEN
    echo ""
fi

echo "⚙️  Настройка Vault..."

# Включить KV v2 движок секретов
echo "📦 Включение KV v2 движка..."
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault secrets enable -version=2 -path=secret kv"

# Создать политику для Tataredu
echo "📋 Создание политики для Tataredu..."
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault policy write tataredu - <<EOF
path \"secret/data/tataredu/*\" {
  capabilities = [\"create\", \"read\", \"update\", \"delete\", \"list\"]
}

path \"secret/metadata/tataredu/*\" {
  capabilities = [\"list\", \"read\", \"delete\"]
}
EOF"

# Включить AppRole аутентификацию
echo "🔐 Включение AppRole аутентификации..."
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault auth enable approle"

# Создать AppRole для Tataredu
echo "👤 Создание AppRole для Tataredu..."
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault write auth/approle/role/tataredu token_policies=tataredu token_ttl=1h token_max_ttl=4h"

# Получить Role ID и Secret ID
echo "🔑 Получение Role ID и Secret ID..."
ROLE_ID=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault read -field=role_id auth/approle/role/tataredu/role-id")
SECRET_ID=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault write -f -field=secret_id auth/approle/role/tataredu/secret-id")

echo ""
echo "✅ Vault настроен"
echo ""
echo "📝 Сохранение credentials в /tmp/vault-tataredu-creds.txt"
cat > /tmp/vault-tataredu-creds.txt <<EOF
VAULT_ADDR=http://vault.vault:8200
VAULT_ROLE_ID=$ROLE_ID
VAULT_SECRET_ID=$SECRET_ID
EOF
cat /tmp/vault-tataredu-creds.txt
echo ""
echo "💡 Используйте эти значения для интеграции с vals"

