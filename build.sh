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

echo "Build complete!"
