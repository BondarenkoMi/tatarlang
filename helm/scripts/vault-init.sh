#!/usr/bin/env bash
set -euo pipefail
umask 077
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-tataredu}"
VAULT_POD="${VAULT_POD:-vault-0}"
KEYS_FILE="${VAULT_KEYS_FILE:-$SCRIPT_DIR/../vault/init-keys.json}"

# Sealed Vault is Running, but cannot be Ready before unseal.
kubectl wait --for=jsonpath='{.status.phase}'=Running "pod/$VAULT_POD" -n "$VAULT_NAMESPACE" --timeout=120s
STATUS=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault status -format=json || test "$?" -eq 2)
INITIALIZED=$(printf '%s' "$STATUS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["initialized"])')
SEALED=$(printf '%s' "$STATUS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["sealed"])')
if [ "$INITIALIZED" != True ]; then
  if [ -e "$KEYS_FILE" ]; then
    echo "Файл ключей уже существует: $KEYS_FILE. Не перезаписываю его." >&2
    exit 1
  fi
  (set -o noclobber; kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault operator init -key-shares=5 -key-threshold=3 -format=json > "$KEYS_FILE")
  echo "Ключи и root token сохранены в $KEYS_FILE (доступ только владельцу)."
fi
if [ "$SEALED" = True ]; then
  if [ ! -f "$KEYS_FILE" ]; then
    echo "Для unseal укажите VAULT_KEYS_FILE с JSON от первоначального vault operator init." >&2
    exit 1
  fi
  for i in 0 1 2; do
    python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["unseal_keys_b64"][int(sys.argv[2])])' "$KEYS_FILE" "$i" |
      kubectl exec -i -n "$VAULT_NAMESPACE" "$VAULT_POD" -- sh -c 'read -r key; vault operator unseal "$key" >/dev/null'
  done
fi
kubectl wait --for=condition=ready "pod/$VAULT_POD" -n "$VAULT_NAMESPACE" --timeout=120s
echo "Vault готов. Для настройки используйте токен из файла ключей."
