<p align="center">
    <h1 align="center">Erin - TikTok-style Video Player with Stash Integration</h1>
    <p align="center">
      Self-hostable TikTok feed for your clips with Stash support
      <br />
      Make a TikTok feed with your own videos from Stash groups
   </p>
</p>

> **Note**: This is a fork of the original [Erin](https://github.com/StashApp/Erin) with integrated [Stash](https://github.com/stashapp/stash) support.

| | | |
|:-------------------------:|:-------------------------:|:-------------------------:|
|<img width="1604" src="/screenshots/SCREENSHOT-1.png"/> |  <img width="1604" src="/screenshots/SCREENSHOT-2.png"/> | <img width="1604" src="/screenshots/SCREENSHOT-3.png"/> |

## Table of Contents

- [Introduction](#introduction)
- [What's New in This Fork](#-whats-new-in-this-fork)
- [Quick Start](#quick-start)
  - [Docker with Stash (Recommended)](#docker-with-stash-recommended)
  - [Docker Standalone](#docker-standalone)
  - [From Source](#from-source)
- [How It Works](#how-it-works)
- [Stash Setup](#stash-setup)
- [Configuration](#configuration)
- [Features](#features)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

## Introduction

Erin is a simple and self-hostable service that enables you to view your own clips using TikTok's well-known vertical swipe feed. This fork adds seamless integration with [Stash](https://github.com/stashapp/stash), allowing you to organize and play videos using Stash's powerful metadata and grouping features.

## 🆕 What's New in This Fork?

- **Stash Integration**: Fetch videos directly from your Stash library using GraphQL
- **Multiple Playlists**: Use Stash groups as playlists - each group becomes a separate feed
- **Built-in Middleware**: Integrated Node.js middleware handles Stash communication
- **Single Docker Container**: Simplified deployment with both services in one image
- **Path Mapping**: Automatic translation between Stash database paths and filesystem
- **Backward Compatible**: Still works with folder-based video organization if you don't use Stash

## Quick Start

### Docker with Stash (Recommended)

```yaml
# docker-compose.yml
version: '3.8'
services:
  erin:
    image: ghcr.io/OppositeOdd/erin-stash:latest
    ports:
      - "3000:80"      # Erin web interface
      - "3001:3001"    # Middleware API
    environment:
      # Stash Configuration
      STASH_URL: http://192.168.1.75:9999
      GROUP_NAMES: Erin,Favorites,Workout
      STASH_PATH_PREFIX: /data
      STASH_API_KEY: ""  # Optional, if Stash requires auth
      
      # Erin Configuration
      PUBLIC_URL: https://erin.yourdomain.com
      AUTH_ENABLED: "true"
      AUTH_SECRET: "your-hashed-password"
      AUTOPLAY_ENABLED: "true"
      SCROLL_DIRECTION: vertical
      PROGRESS_BAR_POSITION: top
    volumes:
      - /mnt/media:/media:ro
```

Start with:
```bash
docker-compose up -d
```

### Docker Standalone

Run Erin without Stash using traditional folder-based organization:

```bash
docker run -d \
  -p 3000:80 \
  -e PUBLIC_URL=https://localhost \
  -e AUTH_ENABLED=false \
  -v /path/to/videos:/srv/videos:ro \
  mosswill/erin
```

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/erin-stash.git
cd erin-stash

# Install dependencies
npm install
cd stash-middleware && npm install && cd ..

# Configure
cp .env.example .env
# Edit .env with your Stash configuration

# Start both services (middleware + React app)
npm run start:both
```

This starts:
- Erin React app on `http://localhost:3000`
- Stash middleware on `http://localhost:3001`

## How It Works

### Architecture with Stash

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Erin Container (Single Docker Image)           │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │   Erin Web UI    │  │  Stash Middleware│     │
│  │   (React + Caddy)│  │   (Node.js)      │     │
│  │   Port: 80       │→│   Port: 3001      │     │
│  └──────────────────┘  └──────────────────┘     │
│           ↓                      ↓              │
└───────────┼──────────────────────┼──────────────┘
            │                      │
            │                      ↓
            │              ┌──────────────────┐
            │              │   Stash Server   │
            │              │   (GraphQL API)  │
            │              └──────────────────┘
            ↓
    ┌──────────────────┐
    │   Media Files    │
    │   (Host Volume)  │
    └──────────────────┘
```

### Data Flow

1. **Erin Web UI** requests video list from middleware at `http://localhost:3001/media/`
2. **Middleware** queries Stash GraphQL API for scenes in configured groups
3. **Stash** returns scene metadata with database paths (e.g., `/data/Videos/movie.mp4`)
4. **Middleware** translates paths using `STASH_PATH_PREFIX` → `/media/Videos/movie.mp4`
5. **Middleware** returns processed video list to Erin
6. **Erin** displays videos and streams them directly from mounted volume

### Path Mapping Example

```
Stash DB:    /data/Videos/Workouts/cardio.mp4
             ↓ (replace STASH_PATH_PREFIX with /media)
Container:   /media/Videos/Workouts/cardio.mp4
             ↓ (mounted from host)
Host:        /mnt/nas/media/Videos/Workouts/cardio.mp4
```

## Stash Setup

### 1. Create Groups in Stash

1. Open Stash web interface (`http://your-stash:9999`)
2. Navigate to **Settings** → **Metadata** → **Groups**
3. Create groups (e.g., "Erin", "Favorites", "Workout", "Learning")
4. Note the exact group names (case-sensitive)

### 2. Add Scenes to Groups

1. Browse to a scene in Stash
2. Click **Edit** button
3. In the **Groups** field, select or create groups
4. Click **Save**

### 3. Configure Erin Environment

In your `.env` or `docker-compose.yml`:

```bash
# Single group
GROUP_NAMES=Erin

# Multiple groups (each becomes a playlist)
GROUP_NAMES=Erin,Favorites,Workout,Learning
```

### 4. Test Middleware

```bash
# Check health
curl http://localhost:3001/health

# View all videos
curl http://localhost:3001/media/

# View specific group
curl http://localhost:3001/media/Erin
```

## Configuration

### Stash-Specific Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STASH_URL` | Yes | - | Full URL to your Stash server (e.g., `http://192.168.1.75:9999`) |
| `GROUP_NAMES` | Yes | - | Comma-separated list of Stash group names (e.g., `Erin,Favorites`) |
| `STASH_PATH_PREFIX` | Yes | `/data` | Path prefix in Stash database (usually `/data`) |
| `STASH_API_KEY` | No | - | Stash API key if authentication is required |

### Erin Core Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PUBLIC_URL` | string | `https://localhost` | Public URL for accessing Erin (include protocol, exclude trailing slash) |
| `AUTH_ENABLED` | boolean | `true` | Enable basic authentication (case-sensitive: `true` or `false`) |
| `AUTH_SECRET` | string | Hash of `secure-password` | Bcrypt hash of your password |
| `APP_TITLE` | string | `Erin - TikTok feed for your own clips` | Browser tab title (use `[VIDEO_TITLE]` for dynamic titles) |
| `AUTOPLAY_ENABLED` | boolean | `false` | Enable automatic video playback |
| `PROGRESS_BAR_POSITION` | string | `bottom` | Progress bar position (`top` or `bottom`) |
| `IGNORE_HIDDEN_PATHS` | boolean | `false` | Ignore hidden files/directories (starting with `.`) |
| `SCROLL_DIRECTION` | string | `vertical` | Video feed scroll direction (`vertical` or `horizontal`) |
| `USE_CUSTOM_SKIN` | boolean | `false` | Load custom CSS stylesheet |

See [ENVIRONMENT-VARIABLES.md](ENVIRONMENT-VARIABLES.md) for complete documentation.

### Generating Password Hash

```bash
docker run caddy caddy hash-password --plaintext "your-new-password"
```

> **Note**: When using `docker-compose.yml`, double all dollar signs in the hash: `$ab$cd` becomes `$$ab$$cd`

## Features

- ✅ Display videos using TikTok's swipe feed UI
- ✅ **Stash Integration**: Fetch videos from Stash groups via GraphQL
- ✅ **Multiple Playlists**: Each Stash group becomes a separate playlist
- ✅ Mask videos you don't want to see (long-press Mask button to manage)
- ✅ Custom feeds per directory/group
- ✅ Autoplay mode for hands-free viewing
- ✅ Keyboard shortcuts and double-tap controls
- ✅ Fullscreen support (double-tap center)
- ✅ Direct video sharing with links
- ✅ Video and playlist metadata display
- ✅ Lazy loading for performance
- ✅ Basic authentication with master password
- ✅ Horizontal and vertical scroll modes
- ✅ Custom CSS styling support
- ✅ HTTP and HTTPS support
- ✅ Reverse proxy compatible

> **Tip**: Long-press the Mask button to open the blacklist manager and view/unmask hidden videos.

## Examples

### Basic Stash Integration

```yaml
version: '3.8'
services:
  erin:
    image: ghcr.io/yourusername/erin-stash:latest
    ports:
      - "3000:80"
      - "3001:3001"
    environment:
      STASH_URL: http://192.168.1.75:9999
      GROUP_NAMES: Erin
      STASH_PATH_PREFIX: /data
    volumes:
      - /mnt/media:/media:ro
```

### Multiple Playlists with Authentication

```yaml
services:
  erin:
    image: ghcr.io/yourusername/erin-stash:latest
    ports:
      - "3000:80"
      - "3001:3001"
    environment:
      STASH_URL: https://stash.example.com:9999
      STASH_API_KEY: your-api-key-here
      GROUP_NAMES: Favorites,Workout,Learning,Archive
      STASH_PATH_PREFIX: /data
      PUBLIC_URL: https://erin.example.com
      AUTH_ENABLED: "true"
      AUTH_SECRET: "$$2a$$14$$hashed-password"
      AUTOPLAY_ENABLED: "true"
    volumes:
      - /mnt/nas/videos:/media:ro
```

### Running Alongside Stash

```yaml
version: '3.8'

services:
  stash:
    image: stashapp/stash:latest
    ports:
      - "9999:9999"
    volumes:
      - ./stash-config:/root/.stash
      - /mnt/media:/data
    
  erin:
    image: ghcr.io/yourusername/erin-stash:latest
    depends_on:
      - stash
    ports:
      - "3000:80"
      - "3001:3001"
    environment:
      STASH_URL: http://stash:9999
      GROUP_NAMES: Erin,Favorites
      STASH_PATH_PREFIX: /data
      PUBLIC_URL: https://erin.example.com
    volumes:
      - /mnt/media:/media:ro
```

### Traditional Folder-Based (No Stash)

```yaml
services:
  erin:
    image: mosswill/erin
    ports:
      - "3000:80"
    environment:
      PUBLIC_URL: https://erin.example.com
      AUTH_ENABLED: "false"
    volumes:
      - /path/to/videos:/srv/videos:ro
```

### With Custom Styling

```yaml
services:
  erin:
    image: ghcr.io/yourusername/erin-stash:latest
    ports:
      - "3000:80"
      - "3001:3001"
    environment:
      STASH_URL: http://stash:9999
      GROUP_NAMES: Erin
      STASH_PATH_PREFIX: /data
      USE_CUSTOM_SKIN: "true"
    volumes:
      - /mnt/media:/media:ro
      - ./custom.css:/srv/custom.css:ro
```

## Troubleshooting

### Stash-Related Issues

#### Videos Not Loading from Stash

**Check middleware connection:**
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","stashUrl":"http://...","groups":["Erin","Favorites"]}
```

**Check middleware logs:**
```bash
docker-compose logs erin | grep middleware
```

**Verify groups exist in Stash:**
- Log into Stash web interface
- Go to **Settings** → **Metadata** → **Groups**
- Ensure group names match `GROUP_NAMES` exactly (case-sensitive)

**Test video retrieval:**
```bash
# View all videos from all groups
curl http://localhost:3001/media/

# View videos from specific group
curl http://localhost:3001/media/Erin
```

#### Path Mapping Issues

**Common problems:**
- `STASH_PATH_PREFIX` doesn't match Stash's configured path
- Media files not accessible at the mounted path
- File permissions prevent reading

**Test path translation:**
```bash
curl http://localhost:3001/media/paths
```

Expected response shows path mapping:
```json
[
  {
    "group": "Erin",
    "sceneId": "123",
    "title": "Video Title",
    "stashPath": "/data/Videos/video.mp4",
    "erinPath": "/media/Videos/video.mp4",
    "filename": "video.mp4"
  }
]
```

#### Connection Refused to Stash

**Checklist:**
- Verify `STASH_URL` is correct and reachable
- Test Stash directly: `curl http://192.168.1.75:9999`
- Check firewall rules between containers
- If using Docker networks, use container name: `http://stash:9999`
- Verify Stash is running and healthy

#### Empty Playlists

**Verify:**
- Groups exist in Stash with the exact names specified
- Scenes are added to those groups
- Scenes have valid file paths in Stash database
- Files exist at the mapped filesystem location
- File permissions allow reading

### General Erin Issues

#### Erin Unreachable Over HTTP/HTTPS

**Standalone deployment:**
- Ensure server/firewall allows connections on Erin's port
- Verify DNS configuration (e.g., `A erin 192.168.1.100`)
- Check `.env` configuration matches [Configuration](#configuration)

**Docker/Proxy deployment:**
- Verify `PUBLIC_URL` is set correctly
- Check proxy forwarding rules
- Verify Docker networking setup
- Review Caddy logs: `docker logs <container-name>`

For more help, see [Caddy address documentation](https://caddyserver.com/docs/caddyfile/concepts#addresses).

#### No Videos Found (Folder Mode)

**Requirements:**
- File extensions must be `.mp4`, `.ogg`, or `.webm`
- Files must be in `/srv/videos` in the container

**Verify volume mount:**
```bash
docker exec -it <container-name> sh
ls /srv/videos
```

#### File Naming

Erin converts filenames to titles:
- `-` becomes ` ` (space)
- `__` becomes ` - `

Examples:
- `Vegas-trip__Clip-1.mp4` → `Vegas trip - Clip 1`
- `Spanish-language__Lesson-1.mp4` → `Spanish language - Lesson 1`

#### Video Order

Videos are randomly shuffled on each browser refresh.

#### Supported Formats

- `.webm` - All browsers
- `.mp4` - All browsers  
- `.ogg` - Not supported in Safari

#### Password Issues

**Docker CLI (`docker run --env-file`):**
- No quotes around `AUTH_SECRET`
- Keep dollar signs as-is

**Docker Compose:**
- Double all dollar signs: `$ab$cd` → `$$ab$$cd`

#### Custom Password Not Working

Generate hash correctly:
```bash
docker run caddy caddy hash-password --plaintext "your-password"
```

Then use the output in your configuration, following the rules above.

## Differences from Original Erin

**Added:**
- Stash GraphQL integration via middleware
- Group-based playlist organization
- Automatic path mapping for Stash
- Dual-port Docker deployment (UI + API)
- Built-in Node.js middleware service

**Preserved:**
- All original Erin features and UI
- TikTok-style vertical/horizontal scrolling
- Video player controls
- Authentication support
- Folder-based mode (backward compatible)
- Custom styling support

## Credits

Big thanks to:
- **[StashApp/Erin](https://github.com/StashApp/Erin)** - Original Erin project
- **[stashapp/stash](https://github.com/stashapp/stash)** - Stash video organizer
- **[tik-tok-clone](https://github.com/cauemustafa/tik-tok-clone)** - Base TikTok UI
- **[Caddy](https://github.com/caddyserver/caddy)** - Web server
- And countless others!

## License

MIT License - Same as original Erin project

See [LICENSE](LICENSE) for details.
