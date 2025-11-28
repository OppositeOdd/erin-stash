# Stash Integration Examples

This directory contains example configurations for running Erin with Stash integration.

## Files

### `.env.example`
Environment variables template for Docker deployment with Stash middleware.

**Usage:**
```bash
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

### `docker-compose.yml`
Complete Docker Compose configuration running both Erin and the Stash middleware in a single container.

**Ports exposed:**
- `3000` - Erin web interface
- `3001` - Stash middleware API

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables in `.env`:**
   ```bash
   STASH_URL=http://localhost:9999
   MEDIA_PATH=/path/to/your/media
   GROUP_NAMES=Erin,Favorites,etc.
   STASH_PATH_PREFIX=/data # wherever media is mapped to your stash setup
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Access Erin:**
   - Web UI: http://localhost:3000
   - API health: http://localhost:3001/health

## Configuration Options

See [ENVIRONMENT-VARIABLES.md](../../ENVIRONMENT-VARIABLES.md) for complete documentation of all available configuration options.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed
- [Stash](https://github.com/stashapp/stash) server running and accessible
- Media files accessible on the host machine
- At least one Stash group created with scenes added

## Differences from Original Erin

This configuration:
- Fetches videos from Stash groups instead of directory scanning
- Each Stash group becomes a new playlist in Erin
- Includes middleware for Stash GraphQL API communication
- Automatically maps Stash database paths to filesystem paths to reduce latency

## Troubleshooting

**Videos not loading:**
```bash
# Check middleware health
curl http://localhost:3001/health

# View logs
docker-compose logs -f
```

**Path mapping issues:**
```bash
# Debug path translation
curl http://localhost:3001/media/paths
```

See [README-STASH.md](../../README-STASH.md) for detailed troubleshooting.
