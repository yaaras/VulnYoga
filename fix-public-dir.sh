#!/bin/bash

echo "🔧 Fixing public directory issue on remote server..."

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Check local file structure
echo "📁 Checking local file structure..."
echo "Public directory exists: $(test -d public && echo 'YES' || echo 'NO')"
echo "Public directory contents:"
ls -la public/ || echo "Public directory not found locally!"

# Check .dockerignore
echo "📋 Checking .dockerignore..."
grep -n "public" .dockerignore || echo "Public not in .dockerignore"

# Force rebuild with no cache
echo "🔨 Force rebuilding with no cache..."
docker-compose build --no-cache

# Start containers
echo "▶️  Starting containers..."
docker-compose up -d

# Wait for startup
echo "⏳ Waiting for startup..."
sleep 15

# Check container file structure
echo "🔍 Checking container file structure..."
docker exec vulnyoga-api ls -la /app/ | grep public || echo "Public directory not found in container"
docker exec vulnyoga-api ls -la /app/public/ || echo "Cannot list public directory contents"

# Test the endpoint
echo "🧪 Testing root endpoint..."
curl -s http://localhost:3000/ | head -5 || echo "Endpoint failed"

echo "✅ Fix attempt complete!"
