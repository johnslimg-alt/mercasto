#!/bin/bash
# Soft Launch Monitoring Script - 48 hours
# Checks Docker container health and port availability

LOG_FILE="/var/log/mercasto-soft-launch.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if critical containers are healthy
FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' mercasto_frontend_container 2>/dev/null || echo "missing")
BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' mercasto_backend_container 2>/dev/null || echo "missing")
DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' mercasto_db_container 2>/dev/null || echo "missing")
REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' mercasto_redis_container 2>/dev/null || echo "missing")

# Check if ports 80 and 443 are listening
PORT_80=$(ss -tlnp | grep -q ":80 " && echo "open" || echo "closed")
PORT_443=$(ss -tlnp | grep -q ":443 " && echo "open" || echo "closed")

# Log results
echo "[$TIMESTAMP] Frontend: $FRONTEND_HEALTH | Backend: $BACKEND_HEALTH | DB: $DB_HEALTH | Redis: $REDIS_HEALTH | Port 80: $PORT_80 | Port 443: $PORT_443" >> $LOG_FILE

# Alert if critical services are not healthy
if [ "$FRONTEND_HEALTH" != "healthy" ] || [ "$BACKEND_HEALTH" != "healthy" ] || [ "$DB_HEALTH" != "healthy" ]; then
    echo "[$TIMESTAMP] ALERT: Critical service unhealthy! Frontend: $FRONTEND_HEALTH, Backend: $BACKEND_HEALTH, DB: $DB_HEALTH" >> $LOG_FILE
fi
