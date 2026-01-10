# 📋 Инструкция по применению ДЗ

## ✅ Что уже сделано

Все три части ДЗ полностью реализованы:

### Часть 1: Базовое развертывание ✅
- ✅ Namespace (`namespace.yaml`)
- ✅ Deployment (`backend.yaml`, `frontend.yaml`)
- ✅ ConfigMap (`config_map.yaml`)
- ✅ Service (включены в соответствующие файлы)

### Часть 2: БД и продвинутые абстракции ✅
- ✅ PV и PVC (`postgres-pv.yaml`, `postgres.yaml`)
- ✅ StatefulSet (`postgres.yaml`)
- ✅ Secret (`secret.yaml`)
- ✅ ConfigMap для БД (`config_map.yaml`)

### Часть 3: Сетевое взаимодействие ✅
- ✅ Job для миграций (`migrate-job.yaml`)
- ✅ CronJob для периодических задач (`cron-clearsessions.yaml`)
- ✅ Init-контейнеры (в `backend.yaml`, `celery-worker.yaml`, `celery-beat.yaml`)
- ✅ Ingress (`ingress.yaml`)
- ✅ TLS Secret (`tls-secret.yaml`)

## 🚀 Что делать дальше

### Шаг 0: Запуск Kubernetes кластера (если еще не запущен)

**Для minikube:**
```bash
cd k8s
./start-minikube.sh
```

Или вручную:
```bash
minikube start
minikube addons enable ingress
```

**Проверка:**
```bash
kubectl cluster-info
```

### Шаг 1: Подготовка образов

Соберите Docker образы для backend и frontend:

```bash
# Backend
cd backend
docker build -t backend:latest .

# Frontend  
cd ../frontend
docker build -t frontend:latest .
```

### Шаг 2: Загрузка образов в кластер (если нужно)

**Для minikube:**
```bash
minikube image load backend:latest
minikube image load frontend:latest
```

**Для kind:**
```bash
kind load docker-image backend:latest
kind load docker-image frontend:latest
```

### Шаг 3: Включение Ingress (если используете minikube)

```bash
minikube addons enable ingress
```

### Шаг 4: Применение манифестов

```bash
cd k8s
./apply.sh
```

Или вручную по порядку (см. `README.md`).

### Шаг 5: Настройка доступа

**Для minikube:**
```bash
# Получить IP
minikube ip

# Добавить в /etc/hosts (macOS/Linux)
sudo echo "$(minikube ip) tataredu.local" >> /etc/hosts

# Или для Windows в C:\Windows\System32\drivers\etc\hosts
```

**Для других кластеров:**
- Получите IP адрес ingress контроллера
- Добавьте его в `/etc/hosts` с доменом `tataredu.local`

### Шаг 6: Проверка

```bash
# Проверить статус всех подов
kubectl get pods -n tataredu

# Проверить сервисы
kubectl get svc -n tataredu

# Проверить ingress
kubectl get ingress -n tataredu

# Посмотреть логи backend
kubectl logs -f deployment/backend -n tataredu
```

### Шаг 7: Доступ к приложению

Откройте в браузере:
- Frontend: `https://tataredu.local` или `http://tataredu.local`
- Backend API: `https://tataredu.local/api` или `http://tataredu.local/api`
- Swagger документация: `https://tataredu.local/api/swagger/`

## 🔧 Настройка TLS (опционально)

По умолчанию используется заглушка. Для реального сертификата:

1. Сгенерируйте самоподписанный сертификат:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=tataredu.local"
```

2. Закодируйте в base64:
```bash
cat tls.crt | base64 -w 0
cat tls.key | base64 -w 0
```

3. Обновите `tls-secret.yaml` с полученными значениями

## 📝 Что проверить для сдачи ДЗ

- [ ] Все манифесты применены без ошибок
- [ ] Поды в статусе Running
- [ ] PostgreSQL StatefulSet работает
- [ ] Job миграций выполнен успешно
- [ ] CronJob создан и запланирован
- [ ] Ingress настроен и доступен
- [ ] Init-контейнеры работают (проверить логи)
- [ ] Приложение доступно через Ingress

## 🐛 Решение проблем

**Поды не запускаются:**
```bash
kubectl describe pod <pod-name> -n tataredu
kubectl logs <pod-name> -n tataredu
```

**Проблемы с образами:**
- Убедитесь, что образы собраны и загружены в кластер
- Проверьте `imagePullPolicy: Never` для локальной разработки

**Проблемы с БД:**
```bash
kubectl logs -f statefulset/postgres -n tataredu
kubectl exec -it postgres-0 -n tataredu -- psql -U postgres
```

**Проблемы с Ingress:**
```bash
kubectl describe ingress tataredu-ingress -n tataredu
# Проверьте, что ingress контроллер установлен
```

## 📚 Дополнительная информация

Подробная документация в `README.md`

