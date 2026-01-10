#!/bin/bash

# Скрипт для быстрого доступа к приложению через port-forward
# Использование: ./start-access.sh
# Оставьте этот скрипт запущенным

echo "🚀 Запуск port-forward для доступа к приложению..."
echo ""
echo "Доступ будет доступен по адресам:"
echo "  ✅ Frontend: http://localhost:3000"
echo "  ✅ Backend API: http://localhost:8000/api"
echo "  ✅ Swagger: http://localhost:8000/api/swagger/"
echo "  ✅ Flower: http://localhost:5555"
echo ""
echo "⚠️  Оставьте этот терминал открытым!"
echo "   Для остановки нажмите Ctrl+C"
echo ""

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка port-forward..."
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Проброс портов в фоне
echo "📡 Запуск port-forward..."
kubectl port-forward -n tataredu service/frontend 3000:3000 &
kubectl port-forward -n tataredu service/backend 8000:8000 &
kubectl port-forward -n tataredu service/flower 5555:5555 &

sleep 2
echo "✅ Port-forward запущен!"
echo ""
echo "🌐 Откройте в браузере:"
echo "   http://localhost:3000"
echo ""

# Ждем завершения
wait

