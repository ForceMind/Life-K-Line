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

echo "
✅ Update Complete!
"
