#!/bin/bash

# Скрипт для unseal Vault
# Использование: ./scripts/vault-unseal.sh [key1] [key2] [key3]

set -e

VAULT_NAMESPACE=${VAULT_NAMESPACE:-vault}
VAULT_POD=$(kubectl get pods -n $VAULT_NAMESPACE -l app.kubernetes.io/name=vault -o jsonpath='{.items[0].metadata.name}')

if [ -z "$VAULT_POD" ]; then
    echo "❌ Vault pod не найден в namespace $VAULT_NAMESPACE"
    exit 1
fi

# Получить ключи из аргументов или файла
if [ $# -ge 3 ]; then
    KEY1=$1
    KEY2=$2
    KEY3=$3
elif [ -f /tmp/vault-unseal-keys.txt ]; then
    echo "📖 Использование ключей из /tmp/vault-unseal-keys.txt"
    KEY1=$(sed -n '1p' /tmp/vault-unseal-keys.txt)
    KEY2=$(sed -n '2p' /tmp/vault-unseal-keys.txt)
    KEY3=$(sed -n '3p' /tmp/vault-unseal-keys.txt)
else
    echo "❌ Укажите 3 unseal ключа или сохраните их в /tmp/vault-unseal-keys.txt"
    echo "   Использование: $0 <key1> <key2> <key3>"
    exit 1
fi

echo "🔓 Unseal Vault..."

# Unseal (нужно 3 из 5 ключей)
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator unseal $KEY1
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator unseal $KEY2
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator unseal $KEY3

echo ""
echo "✅ Vault unsealed"
echo ""
echo "🔍 Проверка статуса:"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault status

