#!/bin/bash
set -e

echo "🚀 Starting production server..."

# Install Python dependencies from dist/requirements.txt (copied during build)
if [ -f "dist/requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install --user -r dist/requirements.txt 2>/dev/null || pip3 install --user -r dist/requirements.txt
elif [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies from root..."
    pip install --user -r requirements.txt 2>/dev/null || pip3 install --user -r requirements.txt
fi

# Start the Node.js server (which will spawn Python FastAPI)
echo "▶️  Starting Node.js server..."
NODE_ENV=production node dist/index.js
