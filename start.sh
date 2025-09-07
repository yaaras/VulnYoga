#!/bin/sh

echo "🚀 Starting VulnYoga..."

# Check if database exists, if not initialize it
if [ ! -f /app/yogastore.db ]; then
    echo "📊 Initializing database..."
    npx prisma db push
    
    # Run seed using compiled JavaScript
    echo "🌱 Seeding database..."
    node dist/prisma/seed.js
    
    echo "✅ Database initialized successfully"
else
    echo "📊 Database already exists, skipping initialization"
fi

# Start the application
echo "🎯 Starting VulnYoga API server..."
npm start
