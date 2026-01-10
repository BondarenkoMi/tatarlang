#!/bin/bash

# Скрипт для инициализации Vault
# Использование: ./scripts/vault-init.sh

set -e

VAULT_NAMESPACE=${VAULT_NAMESPACE:-vault}
VAULT_POD=$(kubectl get pods -n $VAULT_NAMESPACE -l app.kubernetes.io/name=vault -o jsonpath='{.items[0].metadata.name}')

if [ -z "$VAULT_POD" ]; then
    echo "❌ Vault pod не найден в namespace $VAULT_NAMESPACE"
    exit 1
fi

echo "🔐 Инициализация Vault..."

# Инициализация
INIT_OUTPUT=$(kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator init -format=json)

# Сохранение ключей
echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[]' > /tmp/vault-unseal-keys.txt
echo "$INIT_OUTPUT" | jq -r '.root_token' > /tmp/vault-root-token.txt

echo "✅ Vault инициализирован"
echo ""
echo "🔑 Unseal ключи сохранены в /tmp/vault-unseal-keys.txt"
echo "🎫 Root token сохранен в /tmp/vault-root-token.txt"
echo ""
echo "⚠️  ВАЖНО: Сохраните эти ключи в безопасном месте!"
echo ""
echo "📋 Unseal ключи:"
cat /tmp/vault-unseal-keys.txt
echo ""
echo "🎫 Root token:"
cat /tmp/vault-root-token.txt

