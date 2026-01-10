# Helm Chart для Tataredu

Этот Helm chart упаковывает все Kubernetes манифесты проекта Tataredu в единый пакет для удобного развертывания.

## Установка Helm

Если Helm не установлен:

```bash
# macOS
brew install helm

# Или через официальный скрипт
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Использование

### Установка chart

```bash
cd helm/tataredu
helm install tataredu . -n tataredu --create-namespace
```

### Установка с кастомными значениями

```bash
helm install tataredu . -n tataredu --create-namespace -f my-values.yaml
```

### Обновление

```bash
helm upgrade tataredu . -n tataredu
```

### Удаление

```bash
helm uninstall tataredu -n tataredu
```

## Настройка через values.yaml

Все параметры настраиваются в файле `values.yaml`:

- `backend.replicas` - количество реплик backend
- `frontend.replicas` - количество реплик frontend
- `postgres.storage.size` - размер хранилища для PostgreSQL
- `ingress.enabled` - включить/выключить Ingress
- И многое другое...

## Структура chart

```
helm/tataredu/
├── Chart.yaml          # Метаданные chart
├── values.yaml         # Значения по умолчанию
└── templates/          # Шаблоны манифестов
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── backend.yaml
    ├── frontend.yaml
    ├── postgres.yaml
    ├── rabbitmq.yaml
    ├── celery.yaml
    ├── ingress.yaml
    ├── migrate-job.yaml
    └── cronjob.yaml
```

## Проверка шаблонов

Перед установкой можно проверить, какие манифесты будут сгенерированы:

```bash
helm template tataredu . -n tataredu
```

Или с кастомными значениями:

```bash
helm template tataredu . -n tataredu -f my-values.yaml
```

## Отладка

```bash
# Проверить синтаксис
helm lint .

# Посмотреть сгенерированные манифесты
helm template tataredu . -n tataredu --debug

# Проверить значения
helm get values tataredu -n tataredu
```

## Преимущества Helm

1. **Единая точка конфигурации** - все настройки в `values.yaml`
2. **Параметризация** - легко менять конфигурацию без правки манифестов
3. **Версионирование** - можно версионировать развертывания
4. **Шаблонизация** - переиспользование кода через шаблоны
5. **Управление зависимостями** - можно добавлять зависимости от других charts


