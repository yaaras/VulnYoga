#!/bin/bash

echo "🚀 Deploying VulnYoga to Remote Server..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images to force rebuild
echo "🗑️  Removing old images..."
docker-compose down --rmi all

# Build fresh image
echo "🔨 Building fresh image..."
docker-compose build --no-cache

# Start the application
echo "▶️  Starting application..."
docker-compose up -d

# Wait for startup
echo "⏳ Waiting for application to start..."
sleep 10

# Check status
echo "📊 Checking container status..."
docker-compose ps

# Check logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://localhost:3000/healthz || echo "❌ Health check failed"

# Test main endpoint
echo "🌐 Testing main endpoint..."
curl -f http://localhost:3000/ || echo "❌ Main endpoint failed"

echo "✅ Deployment complete!"
echo "🌐 Application should be available at: http://$(hostname -I | awk '{print $1}'):3000"
