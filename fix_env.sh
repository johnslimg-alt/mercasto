sed -i '/CLIP_WEBHOOK_SECRET/d' /var/www/mercasto/backend/.env
echo "CLIP_WEBHOOK_SECRET=$(openssl rand -hex 32)" >> /var/www/mercasto/backend/.env
docker restart mercasto_backend_container
sleep 5
docker exec mercasto_backend_container php artisan config:cache
curl -s -X POST https://mercasto.com/api/webhooks/clip
