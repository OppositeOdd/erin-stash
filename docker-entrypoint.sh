#!/bin/sh
set -e

# Start the Stash middleware in the background
echo "Starting Stash middleware on port ${MIDDLEWARE_PORT:-3001}..."
cd /app/stash-middleware
node server.js &
MIDDLEWARE_PID=$!

# Give middleware a moment to start
sleep 2

# Start Caddy (serves the React app)
echo "Starting Erin web server on port 80..."
cd /srv
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
