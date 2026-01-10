# 📦 Установка Vault из ArtifactHub

## Источник

Vault chart взят из официального репозитория HashiCorp, доступного на ArtifactHub:
- **ArtifactHub**: https://artifacthub.io/packages/helm/hashicorp/vault
- **Репозиторий**: https://helm.releases.hashicorp.com
- **Версия chart**: 0.27.0
- **Версия Vault**: 1.27.0

## Установка

### Способ 1: Через официальный репозиторий (рекомендуется)

```bash
# Добавить репозиторий HashiCorp
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Установить зависимости
cd helm/vault
helm dependency update

# Установить Vault
helm install vault . -n vault --create-namespace -f values.yaml
```

### Способ 2: Прямо из ArtifactHub (если проблемы с основным репозиторием)

Если возникает ошибка 403 при доступе к репозиторию, можно использовать альтернативные способы:

#### Вариант 2a: Через OCI Registry

```bash
# Установить напрямую из Docker Hub OCI registry
helm install vault oci://registry-1.docker.io/hashicorp/vault-helm \
  --version 0.27.0 \
  -n vault \
  --create-namespace \
  -f values.yaml
```

#### Вариант 2b: Скачать chart вручную

```bash
# Скачать chart с ArtifactHub
curl -LO https://github.com/hashicorp/vault-helm/releases/download/v0.27.0/vault-0.27.0.tgz

# Установить
helm install vault ./vault-0.27.0.tgz \
  -n vault \
  --create-namespace \
  -f values.yaml
```

#### Вариант 2c: Использовать зеркало (если есть проблемы с доступом)

```bash
# Если основной репозиторий недоступен, можно использовать зеркало
# Например, через ghproxy для GitHub releases
helm repo add hashicorp-mirror https://ghproxy.com/https://github.com/hashicorp/vault-helm/releases/download/v0.27.0
```

## Проверка установки

```bash
# Проверить, что chart установлен
helm list -n vault

# Проверить статус подов
kubectl get pods -n vault

# Проверить версию Vault
kubectl exec -n vault vault-0 -- vault version
```

## Troubleshooting

### Ошибка 403 при доступе к репозиторию

Если получаете ошибку 403, попробуйте:

1. **Использовать OCI registry**:
   ```bash
   helm install vault oci://registry-1.docker.io/hashicorp/vault-helm -n vault --create-namespace
   ```

2. **Скачать chart вручную** и установить локально

3. **Проверить сетевые настройки** и прокси

### Проблемы с зависимостями

```bash
# Очистить кеш Helm
helm repo remove hashicorp
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Переустановить зависимости
cd helm/vault
rm -rf charts/ Chart.lock
helm dependency update
```

## Ссылки

- [ArtifactHub - Vault Chart](https://artifacthub.io/packages/helm/hashicorp/vault)
- [Официальная документация Vault Helm](https://developer.hashicorp.com/vault/docs/platform/k8s/helm)
- [GitHub - vault-helm](https://github.com/hashicorp/vault-helm)

