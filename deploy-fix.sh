#!/bin/bash

# Деплой исправлений контекстов на сервер
set -e

echo "🚀 Начинаю деплой на сервер..."

# 1. Скопировать обновлённые контексты
echo "📦 Копирую контексты..."
scp -P 22 -r src/contexts root@45.128.237.24:/var/www/mcmercadeo/src/

# 2. Скопировать main.jsx
echo "📦 Копирую main.jsx..."
scp -P 22 src/main.jsx root@45.128.237.24:/var/www/mcmercadeo/src/

# 3. Скопировать App.jsx (если был изменён)
echo "📦 Копирую App.jsx..."
scp -P 22 src/App.jsx root@45.128.237.24:/var/www/mcmercadeo/src/

# 4. На сервере: пересобрать и задеплоить
echo "🔨 Пересобираю на сервере..."
ssh -p 22 root@45.128.237.24 << 'ENDSSH'
cd /var/www/mcmercadeo
echo "📦 Устанавливаю зависимости..."
npm install
echo "🔨 Собираю проект..."
npm run build
echo "🐳 Копирую в контейнер..."
docker cp dist/. mcmercadeo-nginx:/usr/share/nginx/html/
echo "🔄 Перезагружаю nginx..."
docker exec mcmercadeo-nginx nginx -s reload
echo "✅ Деплой завершён!"
ENDSSH

echo "✅ Готово! Откройте сайт и проверьте."
