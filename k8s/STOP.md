# 🛑 Остановка и удаление компонентов

## Быстрый способ

```bash
cd k8s
./stop.sh
```

## Ручное удаление

### Способ 1: Удаление namespace (самый простой)

Удаление namespace автоматически удалит все ресурсы внутри:

```bash
kubectl delete namespace tataredu
```

### Способ 2: Удаление через Helm (если использовали Helm)

```bash
helm uninstall tataredu -n tataredu
kubectl delete namespace tataredu
```

### Способ 3: Удаление отдельных ресурсов

```bash
# Удалить все манифесты
kubectl delete -f ingress.yaml
kubectl delete -f cron-clearsessions.yaml
kubectl delete -f migrate-job.yaml
kubectl delete -f celery-flower.yaml
kubectl delete -f celery-beat.yaml
kubectl delete -f celery-worker.yaml
kubectl delete -f frontend.yaml
kubectl delete -f backend.yaml
kubectl delete -f rabbit.yaml
kubectl delete -f postgres.yaml
kubectl delete -f postgres-pv.yaml
kubectl delete -f secret.yaml
kubectl delete -f config_map.yaml
kubectl delete -f namespace.yaml

# Удалить PersistentVolume (если остался)
kubectl delete pv postgres-pv
```

### Способ 4: Удаление всех ресурсов в namespace

```bash
# Удалить все ресурсы в namespace
kubectl delete all --all -n tataredu

# Удалить остальные ресурсы
kubectl delete pvc --all -n tataredu
kubectl delete configmap --all -n tataredu
kubectl delete secret --all -n tataredu
kubectl delete ingress --all -n tataredu
kubectl delete job --all -n tataredu
kubectl delete cronjob --all -n tataredu

# Удалить namespace
kubectl delete namespace tataredu
```

## Остановка minikube

Если хотите полностью остановить minikube:

```bash
# Остановить minikube (сохраняет состояние)
minikube stop

# Удалить minikube полностью (удаляет все данные)
minikube delete
```

## Проверка удаления

```bash
# Проверить, что namespace удален
kubectl get namespace tataredu

# Проверить все namespace
kubectl get namespaces

# Проверить PersistentVolume
kubectl get pv | grep postgres
```

## Важные замечания

⚠️ **Внимание!** Удаление namespace удалит:
- Все поды, сервисы, deployments
- Все данные в PersistentVolume (если не настроен ReclaimPolicy: Retain)
- Все ConfigMap и Secret

💾 **Для сохранения данных PostgreSQL:**
- Перед удалением сделайте бэкап БД
- Или используйте `ReclaimPolicy: Retain` в PV

## Восстановление после удаления

После удаления можно снова развернуть все:

```bash
cd k8s
./apply.sh
```

Или через Helm:

```bash
cd helm/tataredu
helm install tataredu . -n tataredu --create-namespace
```


