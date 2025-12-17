#!/bin/bash

# Stop on error
set -e

if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (sudo ./setup_nginx.sh)"
  exit 1
fi

echo "🌐 Setting up Nginx Reverse Proxy..."

# 1. Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y nginx
    elif [ -x "$(command -v yum)" ]; then
        yum install -y nginx
    else
        echo "❌ Unsupported package manager. Please install Nginx manually."
        exit 1
    fi
fi

# 2. Get Domain/IP
echo "------------------------------------------------"
echo "Please enter the Domain Name or Public IP for this server."
echo "Examples: example.com OR 47.100.x.x"
echo "------------------------------------------------"
read -p "Domain/IP: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty."
    exit 1
fi

# 3. Create Nginx Config
CONFIG_FILE="/etc/nginx/sites-available/life-k-line"
# Ensure directory exists (some distros might differ, but standard nginx uses this)
if [ ! -d "/etc/nginx/sites-available" ]; then
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    # Add include to nginx.conf if missing? Usually standard.
fi

echo "📝 Writing configuration to $CONFIG_FILE..."

cat > $CONFIG_FILE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# 4. Enable Site
echo "🔗 Enabling site..."
ln -sf $CONFIG_FILE /etc/nginx/sites-enabled/

# Remove default if it exists to avoid conflicts
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️  Removing default Nginx site config..."
    rm -f /etc/nginx/sites-enabled/default
fi

# 5. Test and Restart
echo "🔄 Restarting Nginx..."
nginx -t
systemctl restart nginx

echo "
✅ Nginx Setup Complete!
You can now access the app at: http://$DOMAIN
"
