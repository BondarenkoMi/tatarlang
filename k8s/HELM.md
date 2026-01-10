# 📦 Helm Chart для Tataredu

## ✅ Helm Chart создан!

Создан полный Helm chart в папке `helm/tataredu/`, который упаковывает все Kubernetes манифесты.

## 📁 Структура

```
helm/tataredu/
├── Chart.yaml          # Метаданные chart
├── values.yaml         # Значения по умолчанию
├── .helmignore         # Игнорируемые файлы
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

## 🚀 Быстрый старт

### 1. Установка Helm (если не установлен)

```bash
# macOS
brew install helm
```

### 2. Установка chart

```bash
cd helm/tataredu
helm install tataredu . -n tataredu --create-namespace
```

### 3. Проверка

```bash
kubectl get pods -n tataredu
helm list -n tataredu
```

## 📝 Настройка

Все параметры настраиваются в `values.yaml`:

- Количество реплик
- Образы Docker
- Размер хранилища
- Параметры Ingress
- И многое другое...

## 🔍 Полезные команды

```bash
# Проверить синтаксис
helm lint helm/tataredu

# Посмотреть сгенерированные манифесты
helm template tataredu helm/tataredu -n tataredu

# Обновить развертывание
helm upgrade tataredu helm/tataredu -n tataredu

# Удалить
helm uninstall tataredu -n tataredu
```

## 📚 Подробная документация

См. `helm/tataredu/README.md`


