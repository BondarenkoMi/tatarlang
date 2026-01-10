# 🔐 Vault для Tataredu

Helm chart для развертывания HashiCorp Vault для управления секретами проекта Tataredu.

## Установка

### 1. Установить helm-secrets плагин

```bash
helm plugin install https://github.com/jkroepke/helm-secrets
```

### 2. Добавить репозиторий HashiCorp (из ArtifactHub)

Vault chart взят из ArtifactHub: https://artifacthub.io/packages/helm/hashicorp/vault

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

Если есть проблемы с 403 ошибкой при доступе к репозиторию, можно использовать зеркало или напрямую из ArtifactHub через OCI:

```bash
# Альтернатива через OCI (если основной репозиторий недоступен)
helm install vault oci://registry-1.docker.io/hashicorp/vault-helm -n vault --create-namespace
```

### 3. Установить зависимости

```bash
cd helm/vault
helm dependency update
```

### 4. Установить Vault

```bash
helm install vault . -n vault --create-namespace -f values.yaml
```

## Настройка

### 1. Инициализация Vault

```bash
./scripts/vault-init.sh
```

Это создаст:
- 5 unseal ключей (сохранятся в `/tmp/vault-unseal-keys.txt`)
- Root token (сохранится в `/tmp/vault-root-token.txt`)

⚠️ **ВАЖНО**: Сохраните эти ключи в безопасном месте!

### 2. Unseal Vault

```bash
./scripts/vault-unseal.sh
```

Или вручную с ключами:
```bash
./scripts/vault-unseal.sh <key1> <key2> <key3>
```

### 3. Настройка Vault

```bash
./scripts/vault-setup.sh
```

Это:
- Включит KV v2 движок секретов
- Создаст политику для Tataredu
- Включит AppRole аутентификацию
- Создаст AppRole для Tataredu
- Сохранит credentials в `/tmp/vault-tataredu-creds.txt`

### 4. Настройка env файлов

```bash
cp .env.example .env
# Отредактируйте .env с credentials из vault-setup.sh
```

## Использование

### Доступ к Web UI

После настройки ingress:
```
http://vault.tataredu.local
```

Или через port-forward:
```bash
kubectl port-forward -n vault svc/vault 8200:8200
# Откройте http://localhost:8200
```

### Сохранение секретов

```bash
# Через kubectl exec
kubectl exec -n vault vault-0 -- vault kv put secret/tataredu/postgres \
  POSTGRES_PASSWORD=postgres \
  POSTGRES_USER=postgres

# Или через API
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=$(cat /tmp/vault-root-token.txt)
vault kv put secret/tataredu/postgres POSTGRES_PASSWORD=postgres
```

### Чтение секретов

```bash
vault kv get secret/tataredu/postgres
```

## Интеграция с vals

Vals позволяет использовать Vault секреты в Helm values.

### Установка vals

```bash
brew install vals
```

### Использование в values.yaml

```yaml
secrets:
  postgresPassword: ref+vault://secret/data/tataredu/postgres#POSTGRES_PASSWORD
  rabbitmqPassword: ref+vault://secret/data/tataredu/rabbitmq#RABBITMQ_PASSWORD
```

### Настройка vals

Создайте `~/.vals.yaml`:
```yaml
vault:
  address: http://vault.vault:8200
  auth:
    type: approle
    role_id: <your-role-id>
    secret_id: <your-secret-id>
```

Или используйте переменные окружения из `.env`:
```bash
source .env
export VAULT_ADDR
export VAULT_ROLE_ID
export VAULT_SECRET_ID
```

## Обновление Secret ID

```bash
./scripts/vault-approle.sh
```

## Удаление

```bash
helm uninstall vault -n vault
kubectl delete namespace vault
```

## Troubleshooting

### Vault sealed

```bash
./scripts/vault-unseal.sh
```

### Проверка статуса

```bash
kubectl exec -n vault vault-0 -- vault status
```

### Логи

```bash
kubectl logs -n vault vault-0 -f
```

