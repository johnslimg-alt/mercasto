#!/bin/bash
# ops_setup.sh — Script to apply operational improvements on the Hostinger VPS.
# This script configures:
# 1. Weekly cron job for Docker system prune.
# 2. Daily remote backup replication using rsync (placeholders for remote host).
# 3. Restarts the docker-compose stack with the resource limits file.

set -e

echo "=== Mercasto Ops Setup Tool ==="

# 1. Install Docker weekly prune cron job
echo "Installing Docker weekly system prune cron job..."
CRON_JOB="0 4 * * 0 docker system prune -af --volumes > /var/log/docker-prune.log 2>&1"
(crontab -l 2>/dev/null | grep -Fq "docker system prune" || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -)
echo "✅ Weekly Docker prune configured."

# 2. Create local directory for backups if it doesn't exist
mkdir -p postgres-backups

# 3. Create replication helper script
cat << 'EOF' > scratch/replicate_backups.sh
#!/bin/bash
# replicate_backups.sh — copy local database dumps to offsite storage.
# Configure your REMOTE_SSH_HOST and REMOTE_SSH_PATH inside this script.

BACKUP_DIR="/var/www/mcmercadeo/postgres-backups"
REMOTE_SSH_HOST="your-remote-backup-server.com"
REMOTE_SSH_PORT="22"
REMOTE_SSH_PATH="/backups/mcmercadeo/"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Backup directory $BACKUP_DIR not found!"
  exit 1
fi

echo "Syncing backups to offsite server..."
rsync -avz -e "ssh -p $REMOTE_SSH_PORT" --remove-source-files "$BACKUP_DIR"/ root@$REMOTE_SSH_HOST:$REMOTE_SSH_PATH
echo "✅ Sync complete."
EOF
chmod +x scratch/replicate_backups.sh
echo "✅ Created scratch/replicate_backups.sh for offsite backup sync."

# 4. Instructions for restarting with resource limits
echo ""
echo "=== Setup complete! ==="
echo "To apply resource limits on your live server, execute:"
echo "  docker compose --env-file backend/.env \\"
echo "    -f docker-compose.yml \\"
echo "    -f docker-compose.override.yml \\"
echo "    -f docker-compose.resource-limits.yml \\"
echo "    up -d"
echo ""
