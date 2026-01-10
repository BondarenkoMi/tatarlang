#!/bin/bash

# Скрипт для проверки Helm chart
# Использование: ./scripts/verify.sh

set -e

CHART_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔍 Проверка Helm chart..."

# Проверка установки Helm
if ! command -v helm &> /dev/null; then
    echo "❌ Helm не установлен!"
    echo "   Установите: brew install helm"
    exit 1
fi

cd "$CHART_DIR"

# Lint
echo "📋 Запуск helm lint..."
helm lint .

# Dry-run
echo ""
echo "🧪 Запуск helm install --dry-run..."
helm install tataredu . --dry-run --debug -n tataredu --create-namespace

echo ""
echo "✅ Проверка завершена успешно!"

