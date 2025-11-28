# Stash-Erin Middleware

Node.js middleware that queries Stash's GraphQL API and serves video metadata to Erin.

## Quick Start

Configuration is stored in the root `.env` file (shared with Erin).

```bash
# From project root
npm run start:both          # Start both middleware and Erin
npm run start:middleware    # Start only middleware

# From this directory
npm start                   # Start middleware only
```

## Configuration

Edit the root `.env` file:

```env
# Stash Connection
STASH_URL=http://192.168.1.75:9999
STASH_API_KEY=
GROUP_NAME=Erin

# Server
PORT=3001

# Path Mapping
STASH_PATH_PREFIX=/data
ERIN_PATH_PREFIX=/Volumes/archive/Media
```

## How It Works

1. Queries Stash GraphQL API for videos in specified group
2. Converts Stash database paths to local filesystem paths
3. Serves videos in Erin's expected format at `http://localhost:3001/media/`

## Endpoints

- `GET /media/` - Returns all videos from Stash group
- `GET /media/*` - Serves video files (proxied from filesystem)
