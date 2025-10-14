#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install --user -r requirements.txt

echo "Building frontend with Vite..."
npx vite build

echo "Bundling Node.js server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Copying Python API files to dist..."
mkdir -p dist/api
cp -r server/api/* dist/api/

echo "Copying requirements.txt to dist..."
cp requirements.txt dist/

echo "Copying credentials.json to dist/public..."
mkdir -p dist/public
cp public/credentials.json dist/public/

echo "Build complete!"
