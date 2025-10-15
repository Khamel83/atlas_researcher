#!/bin/bash

# Production startup script for Atlas Researcher
echo "Starting Atlas Researcher in production mode..."

# Load production environment
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✅ Production environment loaded"
else
    echo "❌ .env.production file not found!"
    exit 1
fi

# Start the application
echo "🚀 Starting server on port 3000..."
NODE_ENV=production npm start