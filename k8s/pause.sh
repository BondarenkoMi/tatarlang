#!/bin/bash

# Скрипт для остановки (паузы) всех компонентов без удаления
# Использование: ./pause.sh

set -e

echo "⏸️  Остановка (пауза) компонентов Tataredu..."
echo "   (Все ресурсы останутся, но поды будут остановлены)"
echo ""

# Проверка наличия кластера
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Кластер Kubernetes не доступен!"
    exit 1
fi

# Проверка существования namespace
if ! kubectl get namespace tataredu &>/dev/null; then
    echo "⚠️  Namespace 'tataredu' не существует."
    exit 0
fi

# Масштабирование всех Deployment до 0 реплик
echo "📉 Масштабирование Deployment'ов до 0 реплик..."

# Backend
if kubectl get deployment backend -n tataredu &>/dev/null; then
    kubectl scale deployment backend --replicas=0 -n tataredu
    echo "   ✅ Backend остановлен"
fi

# Frontend
if kubectl get deployment frontend -n tataredu &>/dev/null; then
    kubectl scale deployment frontend --replicas=0 -n tataredu
    echo "   ✅ Frontend остановлен"
fi

# RabbitMQ
if kubectl get deployment rabbitmq -n tataredu &>/dev/null; then
    kubectl scale deployment rabbitmq --replicas=0 -n tataredu
    echo "   ✅ RabbitMQ остановлен"
fi

# Celery Worker
if kubectl get deployment celery-worker -n tataredu &>/dev/null; then
    kubectl scale deployment celery-worker --replicas=0 -n tataredu
    echo "   ✅ Celery Worker остановлен"
fi

# Celery Beat
if kubectl get deployment celery-beat -n tataredu &>/dev/null; then
    kubectl scale deployment celery-beat --replicas=0 -n tataredu
    echo "   ✅ Celery Beat остановлен"
fi

# Flower
if kubectl get deployment flower -n tataredu &>/dev/null; then
    kubectl scale deployment flower --replicas=0 -n tataredu
    echo "   ✅ Flower остановлен"
fi

# StatefulSet PostgreSQL (оставляем 1 реплику, но можно остановить)
read -p "Остановить PostgreSQL? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if kubectl get statefulset postgres -n tataredu &>/dev/null; then
        kubectl scale statefulset postgres --replicas=0 -n tataredu
        echo "   ✅ PostgreSQL остановлен"
    fi
else
    echo "   ℹ️  PostgreSQL оставлен запущенным (данные сохраняются)"
fi

echo ""
echo "✅ Все компоненты остановлены (пауза)"
echo ""
echo "📊 Текущий статус:"
kubectl get pods -n tataredu
echo ""
echo "💡 Для запуска снова используйте: ./resume.sh"
echo "💡 Или вручную: kubectl scale deployment <name> --replicas=<count> -n tataredu"


