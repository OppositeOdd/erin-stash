#!/bin/sh
set -e

# Set default for MEDIA_API_URL if empty
# Use empty string as placeholder - JavaScript will detect this and use window.location.origin
if [ -z "$MEDIA_API_URL" ]; then
  export MEDIA_API_URL=""
fi

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
