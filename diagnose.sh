#!/bin/bash

echo "========================================"
echo "🔍 Life K-Line Server Diagnostics Tool"
echo "========================================"

# 1. Check System Info
echo -e "\n[1] System Information"
echo "OS: $(uname -a)"
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"

# 2. Check PM2 Status
echo -e "\n[2] PM2 Process Status"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo "--- Process Details ---"
    pm2 show life-k-line | grep -E "status|cwd|script|args"
else
    echo "❌ PM2 is not installed!"
fi

# 3. Check Network Ports
echo -e "\n[3] Network Ports (Listening)"
if command -v netstat &> /dev/null; then
    sudo netstat -tulnp | grep -E ':(80|3000)'
else
    echo "⚠️ 'netstat' not found. Trying 'ss'..."
    sudo ss -tulnp | grep -E ':(80|3000)'
fi

# 4. Check Local Connectivity
echo -e "\n[4] Local Connectivity Check"
echo "Testing http://localhost:3000 (Node.js)..."
curl -I -m 5 http://localhost:3000 2>/dev/null | head -n 1 || echo "❌ Failed to connect to localhost:3000"

echo "Testing http://localhost:80 (Nginx)..."
curl -I -m 5 http://localhost:80 2>/dev/null | head -n 1 || echo "❌ Failed to connect to localhost:80"

# 5. Check Firewall
echo -e "\n[5] Firewall Status (UFW)"
if command -v ufw &> /dev/null; then
    sudo ufw status verbose
else
    echo "UFW not installed or not found."
fi

# 6. Check Logs
echo -e "\n[6] Recent Error Logs (Last 20 lines)"
if [ -f "$HOME/.pm2/logs/life-k-line-error.log" ]; then
    tail -n 20 "$HOME/.pm2/logs/life-k-line-error.log"
else
    echo "No error log found at standard path."
fi

echo -e "\n========================================"
echo "✅ Diagnostics Complete."
echo "Please take a screenshot or copy the output above to analyze the issue."
echo "========================================"
