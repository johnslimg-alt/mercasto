#!/bin/bash

# Деплой исправлений контекстов на сервер
set -e

echo "🚀 Начинаю деплой на сервер..."

# 1. Скопировать обновлённые контексты
echo "📦 Копирую контексты..."
scp -r src/contexts mercasto:/var/www/mercasto/src/

# 2. Скопировать main.jsx
echo "📦 Копирую main.jsx..."
scp src/main.jsx mercasto:/var/www/mercasto/src/

# 3. Скопировать App.jsx (если был изменён)
echo "📦 Копирую App.jsx..."
scp src/App.jsx mercasto:/var/www/mercasto/src/
scp src/components/screens/UserDashboard.jsx mercasto:/var/www/mercasto/src/components/screens/
scp src/components/screens/PostScreen.jsx mercasto:/var/www/mercasto/src/components/screens/
scp src/components/screens/HomeScreen.jsx mercasto:/var/www/mercasto/src/components/screens/
scp src/components/screens/AdDetailScreen.jsx mercasto:/var/www/mercasto/src/components/screens/
scp src/components/common/ContactButton.jsx mercasto:/var/www/mercasto/src/components/common/
scp backend/app/Providers/AppServiceProvider.php mercasto:/var/www/mercasto/backend/app/Providers/
scp backend/app/Http/Controllers/Api/AdController.php mercasto:/var/www/mercasto/backend/app/Http/Controllers/Api/
scp src/components/common/MapV3.jsx mercasto:/var/www/mercasto/src/components/common/
scp src/components/common/SidebarFilters.jsx mercasto:/var/www/mercasto/src/components/common/
scp src/index.css mercasto:/var/www/mercasto/src/
scp -r src/locales mercasto:/var/www/mercasto/src/
scp src/constants/categorySchema.js mercasto:/var/www/mercasto/src/constants/
scp src/constants/locationsAndCategories.js mercasto:/var/www/mercasto/src/constants/
scp src/components/screens/verticals/AutosLanding.jsx mercasto:/var/www/mercasto/src/components/screens/verticals/
scp src/components/screens/verticals/ProductosLanding.jsx mercasto:/var/www/mercasto/src/components/screens/verticals/
scp src/components/screens/verticals/TurismoLanding.jsx mercasto:/var/www/mercasto/src/components/screens/verticals/
scp src/components/screens/verticals/CategoryLanding.jsx mercasto:/var/www/mercasto/src/components/screens/verticals/
scp src/utils/verticalCopy.js mercasto:/var/www/mercasto/src/utils/
scp src/utils/analytics.js mercasto:/var/www/mercasto/src/utils/
scp src/utils/metaCapiBridge.js mercasto:/var/www/mercasto/src/utils/

# 4. На сервере: пересобрать и задеплоить
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
