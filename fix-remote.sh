#!/bin/bash

echo "🔧 Fixing remote server deployment..."

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Rebuild with new error handling
echo "🔨 Rebuilding with enhanced error handling..."
docker-compose build

# Start containers
echo "▶️  Starting containers..."
docker-compose up -d

# Wait for startup
echo "⏳ Waiting for startup..."
sleep 10

# Test the endpoint and show detailed error
echo "🧪 Testing root endpoint with detailed error info..."
curl -s http://localhost:3000/ | jq . || echo "Raw response:"
curl -s http://localhost:3000/

echo ""
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "🔍 File system check:"
docker exec vulnyoga-api ls -la /app/public/ || echo "Public directory not found"
docker exec vulnyoga-api find /app -name "index.html" -type f || echo "index.html not found"

echo ""
echo "🌐 Path resolution test:"
docker exec vulnyoga-api node -e "console.log('cwd:', process.cwd()); console.log('path:', require('path').join(process.cwd(), 'public', 'index.html'));"
