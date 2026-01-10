#!/bin/bash

# Скрипт для возобновления работы всех компонентов
# Использование: ./resume.sh

set -e

echo "▶️  Возобновление работы компонентов Tataredu..."
echo ""

# Проверка наличия кластера
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Кластер Kubernetes не доступен!"
    exit 1
fi

# Проверка существования namespace
if ! kubectl get namespace tataredu &>/dev/null; then
    echo "⚠️  Namespace 'tataredu' не существует."
    echo "   Запустите сначала: ./apply.sh"
    exit 1
fi

# Масштабирование всех Deployment обратно

# PostgreSQL (если был остановлен)
if kubectl get statefulset postgres -n tataredu &>/dev/null; then
    CURRENT_REPLICAS=$(kubectl get statefulset postgres -n tataredu -o jsonpath='{.spec.replicas}')
    if [ "$CURRENT_REPLICAS" = "0" ]; then
        kubectl scale statefulset postgres --replicas=1 -n tataredu
        echo "   ✅ PostgreSQL запущен"
        echo "   ⏳ Ожидание готовности PostgreSQL..."
        sleep 5
        kubectl wait --for=condition=ready pod -l app=postgres -n tataredu --timeout=60s || true
    fi
fi

# RabbitMQ
if kubectl get deployment rabbitmq -n tataredu &>/dev/null; then
    kubectl scale deployment rabbitmq --replicas=1 -n tataredu
    echo "   ✅ RabbitMQ запущен"
fi

# Backend
if kubectl get deployment backend -n tataredu &>/dev/null; then
    kubectl scale deployment backend --replicas=2 -n tataredu
    echo "   ✅ Backend запущен (2 реплики)"
fi

# Frontend
if kubectl get deployment frontend -n tataredu &>/dev/null; then
    kubectl scale deployment frontend --replicas=1 -n tataredu
    echo "   ✅ Frontend запущен"
fi

# Celery Worker
if kubectl get deployment celery-worker -n tataredu &>/dev/null; then
    kubectl scale deployment celery-worker --replicas=1 -n tataredu
    echo "   ✅ Celery Worker запущен"
fi

# Celery Beat
if kubectl get deployment celery-beat -n tataredu &>/dev/null; then
    kubectl scale deployment celery-beat --replicas=1 -n tataredu
    echo "   ✅ Celery Beat запущен"
fi

# Flower
if kubectl get deployment flower -n tataredu &>/dev/null; then
    kubectl scale deployment flower --replicas=1 -n tataredu
    echo "   ✅ Flower запущен"
fi

echo ""
echo "✅ Все компоненты запущены"
echo ""
echo "📊 Текущий статус:"
kubectl get pods -n tataredu
echo ""
echo "💡 Для остановки используйте: ./pause.sh"


