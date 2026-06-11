#!/usr/bin/env bash
# scripts/harden-host.sh — Host security hardening script (UFW + CUPS)
set -euo pipefail

echo "=========================================="
echo "🛡️ Starting VPS Host Hardening Routine..."
echo "=========================================="

# 1. Disable CUPS (print daemon) if active to reduce attack surface
if systemctl is-active --quiet cups; then
    echo "⚠️ CUPS print service is active. Stopping and disabling..."
    sudo systemctl stop cups cups-browsed || true
    sudo systemctl disable cups cups-browsed || true
    echo "✅ CUPS disabled."
else
    echo "✅ CUPS service is already inactive/disabled."
fi

# 2. Configure Host Firewall (UFW)
if command -v ufw >/dev/null 2>&1; then
    echo "🔧 Configuring UFW rules..."
    
    # Reset default policies to deny incoming and allow outgoing
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Update default forward policy for Docker compatibility
    if [ -f /etc/default/ufw ]; then
        echo "🔧 Adjusting UFW default forward policy to ACCEPT for Docker compatibility..."
        sudo sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/g' /etc/default/ufw
        sudo sed -i 's/DEFAULT_FORWARD_POLICY="REJECT"/DEFAULT_FORWARD_POLICY="ACCEPT"/g' /etc/default/ufw
    fi
    
    # Allow essential ports
    echo "🔓 Allowing SSH (22)..."
    sudo ufw allow 22/tcp comment 'SSH Secure Access'
    
    echo "🔓 Allowing HTTP (80)..."
    sudo ufw allow 80/tcp comment 'Nginx HTTP'
    
    echo "🔓 Allowing HTTPS (443)..."
    sudo ufw allow 443/tcp comment 'Nginx HTTPS'
    
    # Enable UFW
    echo "🚀 Enabling UFW firewall..."
    sudo ufw --force enable
    
    echo "✅ UFW configuration completed successfully:"
    sudo ufw status verbose
else
    echo "❌ ERROR: 'ufw' utility is not installed on this host. Please install it with: apt-get install ufw"
    exit 1
fi

echo "=========================================="
echo "🛡️ VPS Host Hardening Completed Successfully!"
echo "=========================================="
