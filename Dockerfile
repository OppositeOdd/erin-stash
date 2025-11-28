# 1- Build Caddy modules
FROM caddy:2.9-builder AS builder

RUN xcaddy build \
    --with github.com/caddyserver/replace-response

# 2 - Set up Caddy, Node.js, and the frontend
FROM caddy:2.9-alpine

# Install Node.js for the middleware
RUN apk add --no-cache nodejs npm

# Install the Caddy modules
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Set Caddy configuration
COPY docker/Caddyfile /etc/caddy/Caddyfile

# Install the React App
COPY ./build /srv

# Install the Stash middleware
COPY ./stash-middleware /app/stash-middleware
WORKDIR /app/stash-middleware
RUN npm install --production

# Set default environment variables
ENV AUTH_ENABLED="true"
ENV AUTH_SECRET="\$2a\$14\$qRW8no8UDmSwIWM6KHwdRe1j/LMrxoP4NSM756RVodqeUq5HzG6t."
ENV PUBLIC_URL="https://localhost"
ENV MEDIA_API_URL="http://localhost:3001"
ENV APP_TITLE="Erin - TikTok feed for your own clips"
ENV AUTOPLAY_ENABLED="false"
ENV PROGRESS_BAR_POSITION="bottom"
ENV IGNORE_HIDDEN_PATHS="false"
ENV SCROLL_DIRECTION="vertical"
ENV USE_CUSTOM_SKIN="false"

# Stash middleware environment variables
ENV STASH_URL=""
ENV GROUP_NAMES=""
ENV STASH_PATH_PREFIX="/data"
ENV ERIN_PATH_PREFIX="/data"
ENV STASH_API_KEY=""

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

WORKDIR /srv

# Expose ports
EXPOSE 80 443 3001

# Use entrypoint to start both Caddy and middleware
ENTRYPOINT ["/docker-entrypoint.sh"]
