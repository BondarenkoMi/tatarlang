#!/bin/bash

# Скрипт для проброса портов через port-forward
# Использование: ./port-forward.sh
# Оставьте этот скрипт запущенным в отдельном терминале

echo "🔌 Проброс портов для доступа к приложению..."
echo ""
echo "Доступ будет доступен по адресам:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  Flower:   http://localhost:5555"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка port-forward..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Проброс портов
kubectl port-forward -n tataredu service/frontend 3000:3000 &
kubectl port-forward -n tataredu service/backend 8000:8000 &
kubectl port-forward -n tataredu service/flower 5555:5555 &

# Ждем завершения
wait

