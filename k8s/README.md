# Kubernetes манифесты для проекта Tataredu

Этот каталог содержит все необходимые манифесты Kubernetes для развертывания проекта Tataredu.

## Структура ДЗ

### Часть 1: Базовое развертывание проекта
- ✅ `namespace.yaml` - Namespace для проекта
- ✅ `deployment.yaml` - Базовый Deployment (пример)
- ✅ `backend.yaml` - Deployment и Service для backend
- ✅ `frontend.yaml` - Deployment и Service для frontend
- ✅ `config_map.yaml` - ConfigMap с конфигурацией
- ✅ `service.yaml` - Базовый Service (пример)

### Часть 2: Развертывание БД и продвинутые абстракции
- ✅ `postgres-pv.yaml` - PersistentVolume для PostgreSQL
- ✅ `postgres.yaml` - StatefulSet и Service для PostgreSQL
- ✅ `secret.yaml` - Secret с паролями и чувствительными данными
- ✅ `config_map.yaml` - ConfigMap с настройками БД

### Часть 3: Настройка сетевого взаимодействия
- ✅ `migrate-job.yaml` - Job для применения миграций Django
- ✅ `cron-clearsessions.yaml` - CronJob для периодической очистки сессий
- ✅ `backend.yaml` - Init-контейнер для ожидания готовности БД
- ✅ `ingress.yaml` - Ingress для входящего трафика
- ✅ `tls-secret.yaml` - Secret для TLS-сертификатов

## Дополнительные компоненты

- `rabbit.yaml` - RabbitMQ для Celery
- `celery-worker.yaml` - Celery worker
- `celery-beat.yaml` - Celery beat (периодические задачи)
- `celery-flower.yaml` - Flower (мониторинг Celery)

## Быстрый старт

### Предварительные требования

1. Установленный Kubernetes кластер (minikube, kind, k3s и т.д.)
2. Установленный `kubectl`
3. Собранные Docker образы:
   - `backend:latest` - образ backend приложения
   - `frontend:latest` - образ frontend приложения

### Сборка образов

```bash
# Backend
cd backend
docker build -t backend:latest .

# Frontend
cd frontend
docker build -t frontend:latest .
```

### Применение манифестов

#### Автоматически (рекомендуется):

```bash
cd k8s
chmod +x apply.sh
./apply.sh
```

#### Вручную (по порядку):

```bash
# 1. Namespace
kubectl apply -f namespace.yaml

# 2. ConfigMap и Secret
kubectl apply -f config_map.yaml
kubectl apply -f secret.yaml

# 3. PersistentVolume
kubectl apply -f postgres-pv.yaml

# 4. PostgreSQL
kubectl apply -f postgres.yaml

# 5. Дождаться готовности PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n tataredu --timeout=120s

# 6. RabbitMQ
kubectl apply -f rabbit.yaml

# 7. Миграции
kubectl apply -f migrate-job.yaml
kubectl wait --for=condition=complete job/backend-migrate -n tataredu --timeout=120s

# 8. Backend и Frontend
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# 9. Celery компоненты
kubectl apply -f celery-worker.yaml
kubectl apply -f celery-beat.yaml
kubectl apply -f celery-flower.yaml

# 10. CronJob
kubectl apply -f cron-clearsessions.yaml

# 11. TLS Secret и Ingress
kubectl apply -f tls-secret.yaml
kubectl apply -f ingress.yaml
```

## Настройка доступа

### Для локального доступа (minikube):

```bash
# Получить IP minikube
minikube ip

# Добавить в /etc/hosts (macOS/Linux) или C:\Windows\System32\drivers\etc\hosts (Windows)
<MINIKUBE_IP>  tataredu.local

# Включить ingress в minikube
minikube addons enable ingress
```

### Проверка статуса

```bash
# Проверить поды
kubectl get pods -n tataredu

# Проверить сервисы
kubectl get svc -n tataredu

# Проверить ingress
kubectl get ingress -n tataredu

# Логи backend
kubectl logs -f deployment/backend -n tataredu

# Логи PostgreSQL
kubectl logs -f statefulset/postgres -n tataredu
```

## Настройка TLS сертификатов

Файл `tls-secret.yaml` содержит заглушку. Для продакшена нужно:

1. Получить сертификат (например, через Let's Encrypt или самоподписанный)
2. Закодировать в base64:
   ```bash
   cat tls.crt | base64
   cat tls.key | base64
   ```
3. Обновить `tls-secret.yaml` с реальными значениями

Или использовать cert-manager для автоматического управления сертификатами.

## Удаление

```bash
kubectl delete namespace tataredu
```

## Структура манифестов по требованиям ДЗ

### Часть 1: Базовые абстракции
- **Namespace**: `namespace.yaml`
- **Deployment**: `backend.yaml`, `frontend.yaml`
- **ConfigMap**: `config_map.yaml`
- **Service**: включены в `backend.yaml`, `frontend.yaml`, `postgres.yaml`

### Часть 2: БД и продвинутые абстракции
- **PV и PVC**: `postgres-pv.yaml` (PV), `postgres.yaml` (PVC через volumeClaimTemplates)
- **StatefulSet**: `postgres.yaml`
- **Secret**: `secret.yaml`
- **ConfigMap**: `config_map.yaml` (расширен для БД)

### Часть 3: Сетевое взаимодействие
- **Job**: `migrate-job.yaml` (миграции Django)
- **CronJob**: `cron-clearsessions.yaml` (периодические задачи)
- **Init-контейнеры**: `backend.yaml` (ожидание готовности БД)
- **Ingress**: `ingress.yaml` (входящий трафик)
- **TLS**: `tls-secret.yaml` (HTTPS сертификаты)

## Переменные окружения

### ConfigMap (`config_map.yaml`):
- `POSTGRES_DB` - имя базы данных
- `POSTGRES_USER` - пользователь БД
- `POSTGRES_HOST` - хост БД (postgres)
- `POSTGRES_PORT` - порт БД
- `RABBITMQ_USER` - пользователь RabbitMQ
- `REACT_APP_API_URL` - URL API для frontend
- `CELERY_BROKER_URL` - URL брокера Celery

### Secret (`secret.yaml`):
- `POSTGRES_PASSWORD` - пароль PostgreSQL (base64)
- `RABBITMQ_PASS` - пароль RabbitMQ (base64)

## Примечания

- Все образы используют `imagePullPolicy: Never` для локальной разработки
- Для продакшена нужно использовать registry и изменить `imagePullPolicy`
- PersistentVolume использует `hostPath` для простоты (в продакшене лучше использовать StorageClass)
- CronJob настроен на ежедневную очистку сессий в 03:00 UTC

