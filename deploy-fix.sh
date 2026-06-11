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

echo "📦 Копирую HomeScreen.jsx..."
scp src/components/screens/HomeScreen.jsx mercasto:/var/www/mercasto/src/components/screens/

echo "📦 Копирую MapV3.jsx..."
scp src/components/common/MapV3.jsx mercasto:/var/www/mercasto/src/components/common/

echo "📦 Копирую PostScreen.jsx..."
scp src/components/screens/PostScreen.jsx mercasto:/var/www/mercasto/src/components/screens/

echo "📦 Копирую index.css..."
scp src/index.css mercasto:/var/www/mercasto/src/

echo "📦 Копирую backend файлы..."
scp backend/database/migrations/2026_06_11_000004_add_subcategory_to_ads_table.php mercasto:/var/www/mercasto/backend/database/migrations/
scp backend/app/Http/Controllers/Api/AdController.php mercasto:/var/www/mercasto/backend/app/Http/Controllers/Api/
scp backend/app/Models/Ad.php mercasto:/var/www/mercasto/backend/app/Models/
scp backend/database/seeders/CategoryAttributeSeeder.php mercasto:/var/www/mercasto/backend/database/seeders/
scp scripts/location-search-gate.sh mercasto:/var/www/mercasto/scripts/

# 2. На сервере: пересобрать и задеплоить
echo "🔨 Пересобираю на сервере..."
ssh mercasto << 'ENDSSH'
cd /var/www/mercasto
echo "📦 Запускаю миграции базы данных..."
docker exec mercasto_backend_container php artisan migrate --force
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
