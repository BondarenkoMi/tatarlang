#!/bin/bash

# Скрипт для проверки статуса всех компонентов
# Использование: ./check-status.sh

echo "📊 Статус компонентов проекта Tataredu"
echo "========================================"
echo ""

echo "🔹 Поды:"
kubectl get pods -n tataredu
echo ""

echo "🔹 Сервисы:"
kubectl get svc -n tataredu
echo ""

echo "🔹 StatefulSet:"
kubectl get statefulset -n tataredu
echo ""

echo "🔹 Jobs:"
kubectl get job -n tataredu
echo ""

echo "🔹 CronJobs:"
kubectl get cronjob -n tataredu
echo ""

echo "🔹 Ingress:"
kubectl get ingress -n tataredu
echo ""

echo "🔹 PersistentVolumes:"
kubectl get pv | grep postgres
echo ""

echo "💡 Для просмотра логов используйте:"
echo "   kubectl logs <pod-name> -n tataredu"
echo ""
echo "💡 Для доступа к приложению убедитесь, что запущен:"
echo "   minikube tunnel"
echo ""

