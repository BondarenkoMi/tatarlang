#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${VAULT_TOKEN:?Задайте действующий VAULT_TOKEN из vault operator init}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-tataredu}"
VAULT_POD="${VAULT_POD:-vault-0}"
VAULT_ENV_FILE="${VAULT_ENV_FILE:-$SCRIPT_DIR/../.env}"
kubectl wait --for=condition=ready "pod/$VAULT_POD" -n "$VAULT_NAMESPACE" --timeout=120s

# Секреты передаются через stdin, не через аргументы процесса и не в лог.
CREDENTIALS_FILE=$(mktemp)
cleanup() { rm -f "$CREDENTIALS_FILE"; }
trap cleanup EXIT
{
  printf '%s\n' "$VAULT_TOKEN"
  python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
  python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
  cat <<'REMOTE'
set -eu
export VAULT_ADDR=http://127.0.0.1:8200
engines=$(vault secrets list -format=json)
if ! printf '%s' "$engines" | grep -q '"secret/"'; then
  vault secrets enable -path=secret kv-v2 >/dev/null
fi
# Учебные значения только при первом запуске. Существующие пароли не меняются.
if ! vault kv get secret/tataredu/postgres >/dev/null 2>&1; then
  vault kv put secret/tataredu/postgres user=postgres password=postgres database=tatarlang >/dev/null
fi
if ! vault kv get secret/tataredu/rabbitmq >/dev/null 2>&1; then
  vault kv put secret/tataredu/rabbitmq user=admin password=admin erlang_cookie="$NEW_RABBITMQ_COOKIE" >/dev/null
elif ! vault kv get -field=erlang_cookie secret/tataredu/rabbitmq >/dev/null 2>&1; then
  vault kv patch secret/tataredu/rabbitmq erlang_cookie="$NEW_RABBITMQ_COOKIE" >/dev/null
fi
if ! vault kv get secret/tataredu/redis >/dev/null 2>&1; then
  vault kv put secret/tataredu/redis password=redis-secret-password >/dev/null
fi
current_key=$(vault kv get -field=secret_key secret/tataredu/django 2>/dev/null || true)
if [ -z "$current_key" ] || [ "$current_key" = django-insecure-change-me-in-production ]; then
  vault kv put secret/tataredu/django secret_key="$NEW_DJANGO_KEY" >/dev/null
fi
vault policy write tataredu-policy - >/dev/null <<'POLICY'
path "secret/data/tataredu/postgres" {
  capabilities = ["read"]
}
path "secret/data/tataredu/django" {
  capabilities = ["read"]
}
path "secret/metadata/tataredu/postgres" {
  capabilities = ["read"]
}
path "secret/metadata/tataredu/django" {
  capabilities = ["read"]
}
POLICY
vault policy write rabbitmq-policy - >/dev/null <<'POLICY'
path "secret/data/tataredu/rabbitmq" {
  capabilities = ["read"]
}
path "secret/metadata/tataredu/rabbitmq" {
  capabilities = ["read"]
}
POLICY
vault policy write redis-policy - >/dev/null <<'POLICY'
path "secret/data/tataredu/redis" {
  capabilities = ["read"]
}
path "secret/metadata/tataredu/redis" {
  capabilities = ["read", "list"]
}
POLICY
auth_methods=$(vault auth list -format=json)
if ! printf '%s' "$auth_methods" | grep -q '"approle/"'; then
  vault auth enable approle >/dev/null
fi
vault write auth/approle/role/tataredu-role \
  token_policies=tataredu-policy,rabbitmq-policy,redis-policy \
  token_ttl=1h token_max_ttl=4h secret_id_ttl=24h >/dev/null
ROLE_ID=$(vault read -field=role_id auth/approle/role/tataredu-role/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/tataredu-role/secret-id)
vault write -field=token auth/approle/login role_id="$ROLE_ID" secret_id="$SECRET_ID" >/dev/null
printf '%s\n%s\n' "$ROLE_ID" "$SECRET_ID"
REMOTE
} | kubectl exec -i -n "$VAULT_NAMESPACE" "$VAULT_POD" -- sh -c 'read -r VAULT_TOKEN; read -r NEW_DJANGO_KEY; read -r NEW_RABBITMQ_COOKIE; export VAULT_TOKEN NEW_DJANGO_KEY NEW_RABBITMQ_COOKIE; sh -s' > "$CREDENTIALS_FILE"

python3 - "$VAULT_ENV_FILE" "$CREDENTIALS_FILE" <<'PY'
import os
import sys
from pathlib import Path

path = Path(sys.argv[1])
role_id, secret_id = Path(sys.argv[2]).read_text().splitlines()
updates = {
    "VAULT_ADDR": "http://127.0.0.1:8200",
    "VAULT_AUTH_METHOD": "approle",
    "VAULT_ROLE_ID": role_id,
    "VAULT_SECRET_ID": secret_id,
    "VAULT_SKIP_VERIFY": "false",
    "VAULT_NAMESPACE": os.environ.get("VAULT_NAMESPACE", "tataredu"),
    "VAULT_SERVICE": os.environ.get("VAULT_SERVICE", "vault"),
    "NAMESPACE": os.environ.get("NAMESPACE", "tataredu"),
    "RELEASE_NAME": os.environ.get("RELEASE_NAME", "tataredu"),
}
lines = path.read_text().splitlines() if path.exists() else []
result = []
seen = set()
for line in lines:
    key = line.split("=", 1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key == "VAULT_TOKEN":
        continue
    if key in updates:
        result.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        result.append(line)
for key, value in updates.items():
    if key not in seen:
        result.append(f"{key}={value}")
path.write_text("\n".join(result).rstrip() + "\n")
os.chmod(path, 0o600)
PY
echo "Vault настроен: отдельные policies созданы, AppRole credentials сохранены в $VAULT_ENV_FILE (mode 600)."
