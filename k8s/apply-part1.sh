#!/bin/bash

# Скрипт для применения манифестов первой части ДЗ: Базовое развертывание
# Использование: ./apply-part1.sh
#
# Примечание: Backend имеет init-контейнер, который ждет БД (часть 2 ДЗ),
# поэтому поды backend не запустятся полностью без PostgreSQL.

set -e

echo "🚀 Применение манифестов первой части ДЗ: Базовое развертывание..."
echo ""

# Проверка наличия кластера
echo "🔍 Проверка подключения к кластеру..."
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Кластер Kubernetes не доступен!"
    echo ""
    echo "💡 Для запуска minikube выполните:"
    echo "   ./start-minikube.sh"
    exit 1
fi

echo "✅ Кластер доступен"
echo ""

# 1. Создаем namespace
echo "📦 1. Создание Namespace..."
kubectl apply -f namespace.yaml

# 2. Создаем ConfigMap
echo "🔧 2. Создание ConfigMap..."
kubectl apply -f config_map.yaml

# 3. Создаем Secret (базовый, нужен для ConfigMap)
echo "🔐 3. Создание Secret..."
kubectl apply -f secret.yaml

# 4. Разворачиваем backend (Deployment + Service)
echo "🔧 4. Развертывание Backend (Deployment + Service)..."
kubectl apply -f backend.yaml

# 5. Разворачиваем frontend (Deployment + Service)
echo "🎨 5. Развертывание Frontend (Deployment + Service)..."
kubectl apply -f frontend.yaml

echo ""
echo "✅ Манифесты первой части ДЗ успешно применены!"
echo ""
echo "⚠️  ВАЖНО:"
echo "   Backend содержит init-контейнер, который ждет готовности PostgreSQL."
echo "   Для полного запуска backend нужно применить манифесты второй части ДЗ:"
echo "   kubectl apply -f postgres-pv.yaml"
echo "   kubectl apply -f postgres.yaml"
echo ""
echo "📊 Проверка статуса подов:"
kubectl get pods -n tataredu

echo ""
echo "🌐 Проверка сервисов:"
kubectl get svc -n tataredu

echo ""
echo "💡 Для проверки деталей подов используйте:"
echo "   kubectl get pods -n tataredu"
echo "   kubectl describe pod <pod-name> -n tataredu"
echo "   kubectl logs <pod-name> -n tataredu"

