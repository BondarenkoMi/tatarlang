#!/bin/bash

# Скрипт для запуска minikube и настройки окружения
# Использование: ./start-minikube.sh

set -e

echo "🚀 Запуск minikube для проекта Tataredu..."

# Проверка установки minikube
if ! command -v minikube &> /dev/null; then
    echo "❌ Minikube не установлен!"
    echo "   Установите minikube: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Проверка статуса minikube
MINIKUBE_STATUS=$(minikube status 2>&1 | grep -i "running\|stopped" | head -1 || echo "not running")
if echo "$MINIKUBE_STATUS" | grep -qi "running"; then
    echo "✅ Minikube уже запущен"
    minikube status
elif kubectl cluster-info &>/dev/null; then
    echo "✅ Кластер доступен (не minikube)"
else
    echo "🔄 Запуск minikube..."
    minikube start
    
    echo "⏳ Ожидание готовности кластера..."
    sleep 5
fi

# Настройка kubectl для работы с minikube
echo "🔧 Настройка kubectl..."
minikube kubectl -- get nodes

# Включение ingress addon
echo "🌐 Включение Ingress addon..."
minikube addons enable ingress

# Получение IP адреса
MINIKUBE_IP=$(minikube ip)
echo ""
echo "✅ Minikube готов!"
echo ""
echo "📋 Информация о кластере:"
echo "   IP адрес: $MINIKUBE_IP"
echo ""
echo "💡 Для доступа через Ingress добавьте в /etc/hosts:"
echo "   $MINIKUBE_IP  tataredu.local"
echo ""
echo "   Выполните команду (потребуется пароль):"
echo "   sudo sh -c 'echo \"$MINIKUBE_IP  tataredu.local\" >> /etc/hosts'"
echo ""
echo "   Или добавьте вручную в файл /etc/hosts строку:"
echo "   $MINIKUBE_IP  tataredu.local"
echo ""
echo "⚠️  ВАЖНО: Для работы Ingress нужно запустить в отдельном терминале:"
echo "   minikube tunnel"
echo ""
echo "🚀 Теперь можно применить манифесты:"
echo "   ./apply.sh"

