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
```

## How It Works

1. Queries Stash GraphQL API for videos in specified group(s)
2. Generates streaming URLs using Stash's built-in `/scene/{id}/stream` endpoints
3. Serves video metadata in Erin's expected format at `http://localhost:3001/media/`
4. Browser streams videos directly from Stash server

## Endpoints

- `GET /health` - Health check endpoint
- `GET /media/` - Returns all videos from all configured Stash groups
- `GET /media/:groupName` - Returns videos from specific group
