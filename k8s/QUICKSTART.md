# 🚀 Быстрый старт

## Шаг 1: Запуск minikube

```bash
cd k8s
./start-minikube.sh
```

Или вручную:
```bash
minikube start
minikube addons enable ingress
```

## Шаг 2: Настройка /etc/hosts

Получите IP minikube:
```bash
minikube ip
```

Добавьте в `/etc/hosts` (потребуется sudo):
```bash
sudo sh -c 'echo "192.168.49.2  tataredu.local" >> /etc/hosts'
```

## Шаг 3: Запуск minikube tunnel (ВАЖНО!)

В **отдельном терминале** запустите:
```bash
minikube tunnel
```

Оставьте этот терминал открытым - он нужен для работы Ingress.

## Шаг 4: Сборка Docker образов

```bash
# Backend
cd backend
docker build -t backend:latest .

# Frontend
cd ../frontend
docker build -t frontend:latest .
```

## Шаг 5: Загрузка образов в minikube

```bash
minikube image load backend:latest
minikube image load frontend:latest
```

## Шаг 6: Применение манифестов

```bash
cd k8s
./apply.sh
```

## Шаг 7: Проверка

```bash
# Проверить поды
kubectl get pods -n tataredu

# Проверить сервисы
kubectl get svc -n tataredu

# Проверить ingress
kubectl get ingress -n tataredu
```

## Шаг 8: Доступ к приложению

Откройте в браузере:
- Frontend: `http://tataredu.local`
- Backend API: `http://tataredu.local/api`
- Swagger: `http://tataredu.local/api/swagger/`

## ⚠️ Важные замечания

1. **minikube tunnel** должен быть запущен в отдельном терминале для работы Ingress
2. Образы должны быть собраны и загружены в minikube
3. После изменений в манифестах перезапустите поды:
   ```bash
   kubectl rollout restart deployment/backend -n tataredu
   kubectl rollout restart deployment/frontend -n tataredu
   ```

## 🐛 Решение проблем

**Поды не запускаются:**
```bash
kubectl describe pod <pod-name> -n tataredu
kubectl logs <pod-name> -n tataredu
```

**Ingress не работает:**
- Убедитесь, что `minikube tunnel` запущен
- Проверьте: `kubectl get ingress -n tataredu`

**Проблемы с образами:**
```bash
# Проверить загруженные образы
minikube image ls

# Перезагрузить образ
minikube image load backend:latest
```

