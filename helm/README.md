# 📦 Helm Charts для Tataredu

Этот каталог содержит Helm charts для развертывания проекта Tataredu.

## Структура

```
helm/
├── tataredu/          # Основной chart приложения
└── vault/            # Chart для HashiCorp Vault (секреты)
```

## Быстрый старт

### 1. Установка Helm

```bash
brew install helm
```

### 2. Установка основного приложения

```bash
cd helm/tataredu
helm install tataredu . -n tataredu --create-namespace
```

### 3. Установка Vault (для управления секретами)

```bash
cd helm/vault
helm dependency update
helm install vault . -n vault --create-namespace -f values.yaml
```

## Документация

- [Tataredu Chart](tataredu/README.md) - документация основного chart
- [Vault Chart](vault/README.md) - документация Vault chart

## Проверка

```bash
# Проверить основной chart
cd helm/tataredu
helm lint .
helm install tataredu . --dry-run --debug -n tataredu

# Проверить Vault chart
cd helm/vault
helm lint .
helm install vault . --dry-run --debug -n vault
```

## Релиз

```bash
# Создать релиз основного chart
cd helm/tataredu
./scripts/package.sh 0.1.0

# Создать релиз Vault chart
cd helm/vault
./scripts/package.sh 0.1.0
```

