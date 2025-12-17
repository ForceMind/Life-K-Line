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

# Generate random password if .env doesn't exist
GENERATED_PASS=""
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Generating secure defaults..."
    GENERATED_PASS=$(openssl rand -base64 12)
    cat > .env << EOL
PORT=3000
ADMIN_USER=admin
ADMIN_PASS=$GENERATED_PASS
ADMIN_PATH=/admin
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
EOL
    echo "✅ Created .env with generated password."
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
ADMIN_PATH=$(grep ADMIN_PATH .env | cut -d '=' -f2)
ADMIN_USER=$(grep ADMIN_USER .env | cut -d '=' -f2)
# If we generated a password, use it, otherwise try to read it (might be masked/complex, so just warn)
CURRENT_PASS=$(grep ADMIN_PASS .env | cut -d '=' -f2)

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
