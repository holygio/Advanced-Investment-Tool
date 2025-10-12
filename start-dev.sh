#!/bin/bash

# Start Python FastAPI server in background
cd server && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!

# Go back to root and start Node server
cd ..
NODE_ENV=development tsx server/index.ts &
NODE_PID=$!

# Function to kill both servers on exit
cleanup() {
    echo "Stopping servers..."
    kill $PYTHON_PID $NODE_PID 2>/dev/null
    exit
}

# Register cleanup on script termination
trap cleanup EXIT INT TERM

# Wait for both processes
wait
