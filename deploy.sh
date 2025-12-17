#!/bin/bash

# Stop on error
set -e

echo "🚀 Starting Automated Deployment..."

# 0. Ensure basic tools are installed
if ! command -v curl &> /dev/null || ! command -v git &> /dev/null; then
    echo "📦 Installing basic tools (curl, git)..."
    if [ -x "$(command -v apt-get)" ]; then
        sudo apt-get update
        sudo apt-get install -y curl git
    elif [ -x "$(command -v yum)" ]; then
        sudo yum install -y curl git
    fi
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Generate random password and path if .env doesn't exist
GENERATED_PASS=""
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Generating secure defaults..."
    GENERATED_PASS=$(openssl rand -base64 12)
    RANDOM_SUFFIX=$(openssl rand -hex 4)
    cat > .env << EOL
PORT=3000
ADMIN_USER=admin
ADMIN_PASS=$GENERATED_PASS
ADMIN_PATH=/admin_$RANDOM_SUFFIX
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
EOL
    echo "✅ Created .env with generated password and admin path."
fi

# Ensure ADMIN_PATH exists in .env if it was missing
if ! grep -q "ADMIN_PATH" .env; then
    RANDOM_SUFFIX=$(openssl rand -hex 4)
    echo "ADMIN_PATH=/admin_$RANDOM_SUFFIX" >> .env
fi

# 1. Install Dependencies
echo "📦 Installing dependencies..."
npm install
# Fix permissions for executables
chmod +x node_modules/.bin/*

# 2. Build Frontend
echo "🏗️  Building Frontend..."
npm run build

# 3. Start Server
echo "🚀 Starting Server..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Start/Restart with PM2
pm2 delete life-k-line 2>/dev/null || true
pm2 start server/index.js --name "life-k-line"
pm2 save

# Get Admin Path and User from .env
# Use tr -d '\r' to handle potential Windows line endings
ADMIN_PATH=$(grep ADMIN_PATH .env | cut -d '=' -f2 | tr -d '\r')
ADMIN_USER=$(grep ADMIN_USER .env | cut -d '=' -f2 | tr -d '\r')
# If we generated a password, use it, otherwise try to read it (might be masked/complex, so just warn)
CURRENT_PASS=$(grep ADMIN_PASS .env | cut -d '=' -f2 | tr -d '\r')

echo "
🎉 Deployment Complete! Service is running.

==================================================
🌍 Main App:    http://localhost:3000
🔧 Admin Panel: http://localhost:3000$ADMIN_PATH
==================================================
👤 Admin User:  $ADMIN_USER
🔑 Admin Pass:  $CURRENT_PASS
==================================================

⚠️  IMPORTANT: 
1. Login to the Admin Panel immediately.
2. Click 'System Settings' (系统设置).
3. Enter your DeepSeek API Key.
"

# --- Nginx Setup Section ---
echo ""
read -p "🌐 Do you want to set up Nginx Reverse Proxy (Domain Access)? [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Setting up Nginx..."
    
    # Install Nginx if missing
    if ! command -v nginx &> /dev/null; then
        echo "📦 Installing Nginx..."
        if [ -x "$(command -v apt-get)" ]; then
            sudo apt-get update
            sudo apt-get install -y nginx
        elif [ -x "$(command -v yum)" ]; then
            sudo yum install -y nginx
        else
            echo "❌ Unsupported package manager. Please install Nginx manually."
        fi
    fi

    # Ask for Domain
    echo "------------------------------------------------"
    echo "Please enter the Domain Name or Public IP for this server."
    echo "Examples: example.com OR 47.100.x.x"
    echo "------------------------------------------------"
    read -p "Domain/IP: " DOMAIN

    if [ ! -z "$DOMAIN" ]; then
        CONFIG_FILE="/etc/nginx/sites-available/life-k-line"
        # Ensure directory exists
        if [ ! -d "/etc/nginx/sites-available" ]; then
            sudo mkdir -p /etc/nginx/sites-available
            sudo mkdir -p /etc/nginx/sites-enabled
        fi

        echo "📝 Writing configuration to $CONFIG_FILE..."
        
        # Use sudo tee for writing to protected directories
        sudo tee $CONFIG_FILE > /dev/null <<EOF
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

        # Enable Site
        echo "🔗 Enabling site..."
        sudo ln -sf $CONFIG_FILE /etc/nginx/sites-enabled/
        
        # Remove default if exists
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            sudo rm -f /etc/nginx/sites-enabled/default
        fi

        # Test and Restart
        echo "🔄 Restarting Nginx..."
        sudo nginx -t && sudo systemctl restart nginx
        
        echo "✅ Nginx Setup Complete! Access at: http://$DOMAIN"
    else
        echo "❌ Domain skipped."
    fi
fi

