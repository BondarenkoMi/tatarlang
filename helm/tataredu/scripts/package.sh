#!/bin/bash

# Скрипт для создания релиза Helm chart
# Использование: ./scripts/package.sh [version]

set -e

CHART_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=${1:-$(date +%Y%m%d%H%M%S)}

echo "📦 Создание релиза Helm chart версии $VERSION..."

cd "$CHART_DIR"

# Обновление версии в Chart.yaml
if [ -n "$1" ]; then
    sed -i.bak "s/^version:.*/version: $VERSION/" Chart.yaml
    rm Chart.yaml.bak 2>/dev/null || true
fi

# Проверка
echo "🔍 Проверка chart..."
helm lint .

# Упаковка
echo "📦 Упаковка chart..."
helm package .

# Показать созданный файл
PACKAGE_FILE="tataredu-${VERSION}.tgz"
if [ -f "$PACKAGE_FILE" ]; then
    echo ""
    echo "✅ Релиз создан: $PACKAGE_FILE"
    echo ""
    echo "📊 Информация о пакете:"
    helm show chart "$PACKAGE_FILE"
    echo ""
    echo "💡 Для установки:"
    echo "   helm install tataredu ./$PACKAGE_FILE -n tataredu --create-namespace"
else
    echo "❌ Ошибка при создании пакета"
    exit 1
fi

