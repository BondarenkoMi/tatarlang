# 🚀 Быстрый запуск первой части ДЗ

## Что входит в первую часть ДЗ
- ✅ **Namespace** (`namespace.yaml`)
- ✅ **Deployment** (`backend.yaml`, `frontend.yaml`)
- ✅ **ConfigMap** (`config_map.yaml`)
- ✅ **Service** (включены в `backend.yaml`, `frontend.yaml`)
- ✅ **Secret** (`secret.yaml` - базовая конфигурация)

## Пошаговая инструкция

### Шаг 1: Запуск Kubernetes кластера (minikube)

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

### Шаг 2: Сборка Docker образов

```bash
# Из корня проекта

# Backend
cd backend
docker build -t backend:latest .

# Frontend
cd ../frontend
docker build -t frontend:latest .
```

### Шаг 3: Загрузка образов в minikube

```bash
minikube image load backend:latest
minikube image load frontend:latest
```

**Проверка загруженных образов:**
```bash
minikube image ls | grep -E "backend|frontend"
```

### Шаг 4: Применение манифестов первой части ДЗ

**Автоматически (рекомендуется):**
```bash
cd k8s
./apply-part1.sh
```

**Вручную:**
```bash
cd k8s

# 1. Namespace
kubectl apply -f namespace.yaml

# 2. ConfigMap
kubectl apply -f config_map.yaml

# 3. Secret
kubectl apply -f secret.yaml

# 4. Backend (Deployment + Service)
kubectl apply -f backend.yaml

# 5. Frontend (Deployment + Service)
kubectl apply -f frontend.yaml
```

### Шаг 5: Проверка статуса

```bash
# Проверить поды
kubectl get pods -n tataredu

# Проверить сервисы
kubectl get svc -n tataredu

# Проверить детали подов
kubectl describe pod <pod-name> -n tataredu

# Посмотреть логи
kubectl logs <pod-name> -n tataredu
```

## ⚠️ Важные замечания

### О состоянии подов

Backend содержит **init-контейнер**, который ждет готовности PostgreSQL (это часть 2 ДЗ). 

Поэтому при применении только первой части ДЗ:
- ✅ **Frontend** должен запуститься и работать
- ⏳ **Backend** будет в статусе `Init:0/1` или `Pending` (ждет БД)

Это **нормально** для демонстрации первой части ДЗ, так как:
- Namespace создан ✅
- ConfigMap применен ✅
- Secret применен ✅
- Deployment и Service созданы ✅
- Init-контейнер работает (ожидает БД) ✅

### Для полного запуска backend

Чтобы backend полностью заработал, нужно применить манифесты второй части ДЗ:

```bash
kubectl apply -f postgres-pv.yaml
kubectl apply -f postgres.yaml

# Дождаться готовности PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n tataredu --timeout=120s
```

После этого backend автоматически запустится.

## Проверка компонентов первой части ДЗ

### 1. Проверка Namespace
```bash
kubectl get namespace tataredu
```

### 2. Проверка ConfigMap
```bash
kubectl get configmap app-config -n tataredu
kubectl describe configmap app-config -n tataredu
```

### 3. Проверка Secret
```bash
kubectl get secret app-secret -n tataredu
kubectl describe secret app-secret -n tataredu
```

### 4. Проверка Deployment
```bash
kubectl get deployment -n tataredu
kubectl describe deployment backend -n tataredu
kubectl describe deployment frontend -n tataredu
```

### 5. Проверка Service
```bash
kubectl get svc -n tataredu
kubectl describe svc backend -n tataredu
kubectl describe svc frontend -n tataredu
```

### 6. Проверка Init-контейнера (в backend)
```bash
kubectl describe pod -l app=backend -n tataredu | grep -A 10 "Init Containers"
kubectl logs -l app=backend -c wait-for-db -n tataredu
```

## Доступ к приложению (только для frontend)

Если frontend запустился, можно использовать port-forward для доступа:

```bash
# Frontend
kubectl port-forward svc/frontend 3000:3000 -n tataredu

# Затем откройте в браузере: http://localhost:3000
```

## Удаление компонентов первой части

```bash
cd k8s
kubectl delete -f frontend.yaml
kubectl delete -f backend.yaml
kubectl delete -f secret.yaml
kubectl delete -f config_map.yaml
kubectl delete -f namespace.yaml
```

Или проще:
```bash
kubectl delete namespace tataredu
```

## 🐛 Решение проблем

### Поды не запускаются
```bash
kubectl describe pod <pod-name> -n tataredu
kubectl logs <pod-name> -n tataredu
```

### Проблемы с образами
```bash
# Проверить, загружен ли образ в minikube
minikube image ls | grep backend

# Перезагрузить образ
minikube image load backend:latest
```

### Backend в статусе Init:0/1
Это нормально для первой части ДЗ! Backend ждет PostgreSQL (часть 2 ДЗ).

Для проверки init-контейнера:
```bash
kubectl logs -l app=backend -c wait-for-db -n tataredu
```

## Следующие шаги

После проверки первой части ДЗ, переходите ко второй части:
- PersistentVolume и PVC
- StatefulSet (PostgreSQL)
- Полная конфигурация ConfigMap и Secret

