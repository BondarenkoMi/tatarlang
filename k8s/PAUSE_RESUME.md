# ⏸️ Остановка и запуск проекта (без удаления)

## Остановка проекта (пауза)

Останавливает все поды, но сохраняет конфигурацию:

```bash
cd k8s
./pause.sh
```

Это:
- ✅ Останавливает все поды (масштабирует до 0 реплик)
- ✅ Сохраняет все конфигурации (Deployment, Service, ConfigMap, Secret)
- ✅ Сохраняет данные в PostgreSQL (если не остановить БД)
- ✅ Не удаляет ресурсы

## Запуск проекта (возобновление)

Запускает все компоненты обратно:

```bash
cd k8s
./resume.sh
```

## Ручное управление

### Остановить конкретный компонент

```bash
# Остановить backend
kubectl scale deployment backend --replicas=0 -n tataredu

# Остановить frontend
kubectl scale deployment frontend --replicas=0 -n tataredu

# Остановить PostgreSQL
kubectl scale statefulset postgres --replicas=0 -n tataredu
```

### Запустить конкретный компонент

```bash
# Запустить backend (2 реплики)
kubectl scale deployment backend --replicas=2 -n tataredu

# Запустить frontend
kubectl scale deployment frontend --replicas=1 -n tataredu

# Запустить PostgreSQL
kubectl scale statefulset postgres --replicas=1 -n tataredu
```

## Проверка статуса

```bash
# Посмотреть все поды
kubectl get pods -n tataredu

# Посмотреть статус конкретного deployment
kubectl get deployment backend -n tataredu

# Посмотреть логи (если под запущен)
kubectl logs -f deployment/backend -n tataredu
```

## Разница между остановкой и удалением

| Действие | Что происходит | Данные | Конфигурация |
|----------|---------------|--------|--------------|
| **Пауза** (`pause.sh`) | Поды останавливаются (0 реплик) | ✅ Сохраняются | ✅ Сохраняется |
| **Удаление** (`stop.sh`) | Все ресурсы удаляются | ❌ Удаляются* | ❌ Удаляется |

*Данные в PV могут сохраниться, если настроен `ReclaimPolicy: Retain`

## Когда использовать паузу

- ✅ Хотите временно остановить проект
- ✅ Нужно освободить ресурсы (CPU/RAM)
- ✅ Хотите сохранить конфигурацию
- ✅ Не хотите пересоздавать все заново

## Когда использовать удаление

- ✅ Хотите полностью очистить кластер
- ✅ Тестируете развертывание с нуля
- ✅ Больше не нужен проект


