#!/bin/bash

# Скрипт для остановки и удаления всех компонентов Tataredu из Kubernetes
# Использование: ./stop.sh

set -e

echo "🛑 Остановка и удаление компонентов Tataredu..."

# Проверка наличия кластера
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Кластер Kubernetes не доступен!"
    exit 1
fi

# Проверка существования namespace
if ! kubectl get namespace tataredu &>/dev/null; then
    echo "⚠️  Namespace 'tataredu' не существует. Возможно, уже удален."
    exit 0
fi

echo ""
echo "📋 Текущие ресурсы в namespace tataredu:"
kubectl get all -n tataredu

echo ""
read -p "Вы уверены, что хотите удалить все ресурсы? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено пользователем"
    exit 0
fi

echo ""
echo "🗑️  Удаление ресурсов..."

# Удаление через Helm (если установлен через Helm)
if helm list -n tataredu 2>/dev/null | grep -q tataredu; then
    echo "📦 Удаление через Helm..."
    helm uninstall tataredu -n tataredu 2>/dev/null || true
fi

# Удаление всех ресурсов через kubectl
echo "🗑️  Удаление манифестов..."
kubectl delete -f ingress.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f tls-secret.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f cron-clearsessions.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f migrate-job.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f celery-flower.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f celery-beat.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f celery-worker.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f frontend.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f backend.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f rabbit.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f postgres.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f postgres-pv.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f secret.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f config_map.yaml --ignore-not-found=true 2>/dev/null || true

# Удаление namespace (удалит все оставшиеся ресурсы)
echo "🗑️  Удаление namespace..."
kubectl delete namespace tataredu --ignore-not-found=true

# Удаление PersistentVolume (если остался)
echo "🗑️  Очистка PersistentVolume..."
kubectl delete pv postgres-pv --ignore-not-found=true 2>/dev/null || true

echo ""
echo "✅ Все компоненты удалены!"
echo ""
echo "💡 Для проверки:"
echo "   kubectl get namespace tataredu"
echo ""
echo "💡 Если нужно остановить minikube:"
echo "   minikube stop"
echo "   # или"
echo "   minikube delete"


