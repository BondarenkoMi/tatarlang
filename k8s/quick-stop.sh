#!/bin/bash

# Быстрая остановка - просто удаляет namespace
# Использование: ./quick-stop.sh

echo "🛑 Быстрая остановка Tataredu..."

if kubectl get namespace tataredu &>/dev/null; then
    echo "🗑️  Удаление namespace tataredu..."
    kubectl delete namespace tataredu
    echo "✅ Готово!"
else
    echo "⚠️  Namespace 'tataredu' не существует"
fi

# Удаление PV (если остался)
kubectl delete pv postgres-pv --ignore-not-found=true 2>/dev/null || true

echo ""
echo "💡 Для полной остановки minikube: minikube stop"


