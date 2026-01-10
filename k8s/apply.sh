#!/bin/bash

# Скрипт для применения всех манифестов Kubernetes в правильном порядке
# Использование: ./apply.sh

set -e

echo "🚀 Применение манифестов Kubernetes для проекта Tataredu..."

# Проверка наличия кластера
echo "🔍 Проверка подключения к кластеру..."
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Кластер Kubernetes не доступен!"
    echo ""
    echo "💡 Для запуска minikube выполните:"
    echo "   minikube start"
    echo ""
    echo "   Или используйте скрипт: ./start-minikube.sh"
    exit 1
fi

echo "✅ Кластер доступен"
echo ""

# 1. Создаем namespace
echo "📦 Создание namespace..."
kubectl apply -f namespace.yaml

# 2. Создаем ConfigMap и Secret (базовые конфигурации)
echo "🔐 Создание ConfigMap и Secret..."
kubectl apply -f config_map.yaml
kubectl apply -f secret.yaml

# 3. Создаем PersistentVolume для БД
echo "💾 Создание PersistentVolume для PostgreSQL..."
kubectl apply -f postgres-pv.yaml

# 4. Разворачиваем PostgreSQL (StatefulSet)
echo "🐘 Развертывание PostgreSQL (StatefulSet)..."
kubectl apply -f postgres.yaml

# 5. Ждем готовности PostgreSQL
echo "⏳ Ожидание готовности PostgreSQL..."
echo "   (ожидание создания подов StatefulSet...)"
sleep 5
# Ждем пока поды появятся
for i in {1..30}; do
    if kubectl get pods -n tataredu -l app=postgres 2>/dev/null | grep -q postgres; then
        break
    fi
    echo "   Попытка $i/30..."
    sleep 2
done
# Теперь ждем готовности
kubectl wait --for=condition=ready pod -l app=postgres -n tataredu --timeout=120s || {
    echo "⚠️  Предупреждение: PostgreSQL может еще запускаться"
    kubectl get pods -n tataredu -l app=postgres
}

# 6. Разворачиваем RabbitMQ
echo "🐰 Развертывание RabbitMQ..."
kubectl apply -f rabbit.yaml

# 7. Применяем миграции Django (Job)
echo "🔄 Применение миграций Django..."
kubectl apply -f migrate-job.yaml
echo "   (ожидание выполнения миграций...)"
sleep 3
kubectl wait --for=condition=complete job/backend-migrate -n tataredu --timeout=120s || {
    echo "⚠️  Предупреждение: Job миграций может еще выполняться или завершиться с ошибкой"
    kubectl get job backend-migrate -n tataredu
    kubectl logs job/backend-migrate -n tataredu --tail=20 || true
}

# 8. Разворачиваем backend
echo "🔧 Развертывание backend..."
kubectl apply -f backend.yaml

# 9. Разворачиваем frontend
echo "🎨 Развертывание frontend..."
kubectl apply -f frontend.yaml

# 10. Разворачиваем Celery worker
echo "⚙️  Развертывание Celery worker..."
kubectl apply -f celery-worker.yaml

# 11. Разворачиваем Celery beat
echo "⏰ Развертывание Celery beat..."
kubectl apply -f celery-beat.yaml

# 12. Разворачиваем Flower
echo "🌸 Развертывание Flower..."
kubectl apply -f celery-flower.yaml

# 13. Создаем CronJob для периодических задач
echo "📅 Создание CronJob для периодических задач..."
kubectl apply -f cron-clearsessions.yaml

# 14. Создаем TLS Secret (заглушка, нужно заменить на реальный)
echo "🔒 Создание TLS Secret..."
kubectl apply -f tls-secret.yaml

# 15. Создаем Ingress
echo "🌐 Создание Ingress..."
kubectl apply -f ingress.yaml

echo ""
echo "✅ Все манифесты успешно применены!"
echo ""
echo "📊 Проверка статуса подов:"
kubectl get pods -n tataredu

echo ""
echo "🌐 Проверка сервисов:"
kubectl get svc -n tataredu

echo ""
echo "📋 Проверка Ingress:"
kubectl get ingress -n tataredu

echo ""
echo "💡 Для доступа к приложению добавьте в /etc/hosts:"
echo "   <INGRESS_IP>  tataredu.local"
echo ""
echo "   Затем откройте в браузере: https://tataredu.local"

