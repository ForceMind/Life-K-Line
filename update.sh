#!/bin/bash

# Stop on error
set -e

echo "🔄 Starting Update Process..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull

# 2. Install Dependencies (in case package.json changed)
echo "📦 Updating dependencies..."
npm install
chmod +x node_modules/.bin/*

# 3. Rebuild Frontend
echo "🏗️  Rebuilding Frontend..."
npm run build

# 4. Restart Server
echo "🚀 Restarting Server..."
pm2 restart life-k-line

# 5. Show Info
ADMIN_PATH=$(grep ADMIN_PATH .env | cut -d '=' -f2 | tr -d '\r')
ADMIN_USER=$(grep ADMIN_USER .env | cut -d '=' -f2 | tr -d '\r')
CURRENT_PASS=$(grep ADMIN_PASS .env | cut -d '=' -f2 | tr -d '\r')

echo "
✅ Update Complete!

==================================================
🌍 Main App:    http://localhost:3000
🔧 Admin Panel: http://localhost:3000$ADMIN_PATH
==================================================
👤 Admin User:  $ADMIN_USER
🔑 Admin Pass:  $CURRENT_PASS
==================================================
"
