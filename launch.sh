#!/bin/bash

# Kill anything already on port 3000
fuser -k 3000/tcp 2>/dev/null

# Move to the app directory
cd "$(dirname "$0")"

# Start the dev server in the background
npm run dev &

# Wait for the server to be ready
echo "Starting NeurExp Tracker..."
sleep 3

# Open the browser
xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null

# Keep the terminal open so the server keeps running
wait
