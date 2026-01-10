#!/bin/bash

# Скрипт для создания нового Secret ID для AppRole
# Использование: ./scripts/vault-approle.sh

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

echo "🔑 Создание нового Secret ID для AppRole tataredu..."

SECRET_ID=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c "VAULT_TOKEN=$ROOT_TOKEN vault write -f -field=secret_id auth/approle/role/tataredu/secret-id")

echo "✅ Новый Secret ID создан:"
echo "$SECRET_ID"
echo ""
echo "💡 Обновите VAULT_SECRET_ID в env файлах"

