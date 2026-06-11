#!/bin/bash

# Деплой исправлений на сервер Mercasto
set -e

echo "🚀 Начинаю деплой на сервер mercasto (72.62.173.145)..."

# 1. Скопировать обновлённые файлы
echo "📦 Копирую App.jsx..."
scp src/App.jsx mercasto:/var/www/mercasto/src/

echo "📦 Копирую AdDetailScreen.jsx..."
scp src/components/screens/AdDetailScreen.jsx mercasto:/var/www/mercasto/src/components/screens/

echo "📦 Копирую SplitViewContainer.jsx..."
scp src/components/common/SplitViewContainer.jsx mercasto:/var/www/mercasto/src/components/common/

# 2. На сервере: пересобрать и задеплоить
echo "🔨 Пересобираю на сервере..."
ssh mercasto << 'ENDSSH'
cd /var/www/mercasto
echo "📦 Устанавливаю зависимости..."
npm install
echo "🔨 Собираю проект..."
npm run build
echo "🐳 Копирую в контейнер..."
docker cp dist/. mercasto_frontend_container:/usr/share/nginx/html/
echo "🔄 Перезагружаю nginx..."
docker exec mercasto_frontend_container nginx -s reload
echo "✅ Деплой завершён!"
ENDSSH

echo "✅ Готово! Откройте сайт и проверьте."
