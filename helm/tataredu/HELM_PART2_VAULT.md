# 🔐 Часть 2: Настройка секретов с Vault

## Задачи

1. ✅ Установить helm-secrets
2. ✅ Развернуть Vault
3. ✅ Настроить чарт vault
4. ✅ Настроить ingress
5. ✅ Настроить API
6. ✅ Включить web-интерфейс
7. ✅ Настроить сертификаты (опционально)
8. ✅ Настроить HA (опционально)
9. ✅ Настроить vault: init, unseal, движок секретов, политики, AppRole
10. ✅ Настроить интеграцию vals с vault
11. ✅ Создать env и env-example

## Быстрый старт

```bash
# 1. Установить helm-secrets
helm plugin install https://github.com/jkroepke/helm-secrets

# 2. Добавить репозиторий HashiCorp
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# 3. Установить Vault
cd helm/vault
helm install vault hashicorp/vault -f values.yaml -n vault --create-namespace

# 4. Инициализация и unseal (см. скрипты)
./scripts/vault-init.sh
./scripts/vault-unseal.sh

# 5. Настройка (см. скрипты)
./scripts/vault-setup.sh
```

## Структура

```
helm/vault/
├── Chart.yaml (зависимость от hashicorp/vault)
├── values.yaml (конфигурация Vault)
├── templates/ (кастомные шаблоны если нужны)
├── scripts/
│   ├── vault-init.sh
│   ├── vault-unseal.sh
│   ├── vault-setup.sh
│   └── vault-approle.sh
└── secrets/
    ├── .sops.yaml
    └── vault-keys.yaml.enc (зашифрованные ключи)
```

