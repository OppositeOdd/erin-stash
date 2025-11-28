# Environment Variables Reference

This document describes all environment variables available for configuring Erin and the Stash Middleware.

## Quick Start

1. Copy `.env.example` to `.env`
2. Update the variables for your setup
3. Run `npm run start:both` for development
4. Or run `docker-compose up -d` for production

---

## Erin React App Variables

All Erin variables must be prefixed with `REACT_APP_` for create-react-app to pick them up.

### `REACT_APP_MEDIA_API_URL`
**Description:** URL of the middleware API that provides video metadata  
**Type:** String (URL)  
**Default:** `http://localhost:3001`  
**Examples:**
- Development: `http://localhost:3001`
- Network: `http://192.168.1.100:3001`
- Production: `https://api.example.com`

**Usage:** Erin connects to this URL to fetch the list of videos from Stash

---

### `REACT_APP_SCROLL_DIRECTION`
**Description:** Direction of the video feed scrolling (TikTok-style navigation)  
**Type:** String  
**Options:** `vertical` | `horizontal`  
**Default:** `vertical`

**Usage:** Controls whether users scroll up/down or left/right to navigate videos

---

### `REACT_APP_AUTOPLAY_ENABLED`
**Description:** Whether videos should automatically play when scrolled into view  
**Type:** Boolean  
**Options:** `true` | `false`  
**Default:** `true`

**Usage:** If enabled, videos start playing as soon as they become visible

---

### `REACT_APP_PROGRESS_BAR_POSITION`
**Description:** Position of the video playback progress bar  
**Type:** String  
**Options:** `top` | `bottom`  
**Default:** `top`

**Usage:** Controls where the progress bar appears on each video

---

### `REACT_APP_IGNORE_HIDDEN_PATHS`
**Description:** Skip videos in hidden directories (paths starting with `.`)  
**Type:** Boolean  
**Options:** `true` | `false`  
**Default:** `true`

**Usage:** Filters out videos from hidden folders like `.trash` or `.cache`

---

## Stash Middleware Variables

These variables configure the Node.js middleware that connects to your Stash server.

### `STASH_URL`
**Description:** Full URL to your Stash server  
**Type:** String (URL)  
**Required:** Yes  
**Default:** `http://localhost:9999`  
**Examples:**
- Local: `http://localhost:9999`
- Network: `http://192.168.1.75:9999`
- Docker: `http://stash:9999`

**Usage:** The middleware queries this Stash GraphQL API to fetch video metadata

---

### `STASH_API_KEY`
**Description:** API key for authenticating with Stash  
**Type:** String (JWT token)  
**Required:** No  
**Default:** Empty string

**Usage:** Only needed if your Stash instance requires API authentication. Get this from Stash Settings → Security → API Key

---

### `GROUP_NAMES`
**Description:** Comma-separated list of Stash group names to fetch and display as separate playlists  
**Type:** String (comma-separated list)  
**Required:** Yes  
**Default:** `Erin`  
**Format:** `Group1,Group2,Group3` (spaces around commas are automatically trimmed)  
**Case-Sensitive:** Yes

**Examples:**
- Single group: `Erin`
- Multiple groups: `Erin,Favorites,Workout Videos`
- With spaces: `Erin, Best Of, New Releases` (spaces are trimmed automatically)

**Usage:** The middleware fetches all videos from each specified group and uses the group name as the playlist identifier in Erin. Each group appears as a separate playlist, allowing you to organize your content by category, genre, or any custom grouping you create in Stash.

---

### `MIDDLEWARE_PORT`
**Description:** Port for the middleware server to listen on  
**Type:** Number  
**Default:** `3001`  
**Note:** Must be different from Erin's port (3000)

**Usage:** The middleware HTTP server binds to this port

---

## Path Mapping Variables

These variables handle the translation between Stash's internal paths and your actual filesystem paths.

### `STASH_PATH_PREFIX`
**Description:** Path prefix used in Stash's database  
**Type:** String (filesystem path)  
**Required:** Yes  
**Default:** `/data`

**Examples:**
- Docker: `/data`
- Windows: `D:\Media`
- Linux: `/mnt/storage`

**Usage:** When Stash stores a video path like `/data/Videos/video.mp4`, this is the `/data` part

---

### `ERIN_PATH_PREFIX`
**Description:** Actual filesystem path where media files are located  
**Type:** String (filesystem path)  
**Required:** Yes  
**Platform Examples:**
- macOS: `/Volumes/archive/Media`
- Linux: `/mnt/media`
- Windows: `C:\Media`
- Docker: `/media`

**Usage:** The middleware replaces `STASH_PATH_PREFIX` with `ERIN_PATH_PREFIX` to find the actual files

**Example Path Mapping:**
```
Stash DB:  /data/Videos/movie.mp4
           ↓ (Replace /data with /Volumes/archive/Media)
Filesystem: /Volumes/archive/Media/Videos/movie.mp4
```

---

## Complete Example `.env` Files

### Development (Local Stash)
```bash
# Erin Configuration
REACT_APP_MEDIA_API_URL=http://localhost:3001
REACT_APP_SCROLL_DIRECTION=vertical
REACT_APP_AUTOPLAY_ENABLED=true
REACT_APP_PROGRESS_BAR_POSITION=top
REACT_APP_IGNORE_HIDDEN_PATHS=true

# Stash Middleware Configuration
STASH_URL=http://localhost:9999
STASH_API_KEY=
GROUP_NAMES=Erin
MIDDLEWARE_PORT=3001

# Path Mapping (macOS example)
STASH_PATH_PREFIX=/data
ERIN_PATH_PREFIX=/Volumes/archive/Media
```

### Multiple Playlists (Using Multiple Groups)
```bash
# Erin Configuration
REACT_APP_MEDIA_API_URL=http://localhost:3001
REACT_APP_SCROLL_DIRECTION=vertical
REACT_APP_AUTOPLAY_ENABLED=true
REACT_APP_PROGRESS_BAR_POSITION=top
REACT_APP_IGNORE_HIDDEN_PATHS=true

# Stash Middleware Configuration
STASH_URL=http://192.168.1.75:9999
STASH_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GROUP_NAMES=ErinProduction,Premium Content
MIDDLEWARE_PORT=3001

# Path Mapping
STASH_PATH_PREFIX=/data
ERIN_PATH_PREFIX=/Volumes/archive/Media
```

### Production (Remote Stash with Authentication)
```bash
# Erin Configuration
REACT_APP_MEDIA_API_URL=https://api.example.com
REACT_APP_SCROLL_DIRECTION=vertical
REACT_APP_AUTOPLAY_ENABLED=true
REACT_APP_PROGRESS_BAR_POSITION=bottom
REACT_APP_IGNORE_HIDDEN_PATHS=true

# Stash Middleware Configuration
STASH_URL=http://192.168.1.75:9999
STASH_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GROUP_NAME=ErinProduction
MIDDLEWARE_PORT=3001

# Path Mapping (Linux example)
STASH_PATH_PREFIX=/data
ERIN_PATH_PREFIX=/mnt/media/videos
```

### Docker Compose
```bash
# Erin Configuration
REACT_APP_MEDIA_API_URL=http://localhost:3001
REACT_APP_SCROLL_DIRECTION=vertical
REACT_APP_AUTOPLAY_ENABLED=true
REACT_APP_PROGRESS_BAR_POSITION=top
REACT_APP_IGNORE_HIDDEN_PATHS=true

# Stash Middleware Configuration
STASH_URL=http://stash:9999
STASH_API_KEY=
GROUP_NAMES=Erin
MIDDLEWARE_PORT=3001

# Path Mapping (Docker volumes)
STASH_PATH_PREFIX=/data
ERIN_PATH_PREFIX=/media
```

---

## Troubleshooting

### Videos Not Loading
- Check `STASH_URL` is correct and Stash is accessible
- Verify `GROUP_NAMES` matches exactly (case-sensitive)
- Ensure all listed groups exist in Stash
- Check path mapping is correct (`STASH_PATH_PREFIX` → `ERIN_PATH_PREFIX`)

### Erin Can't Connect to Middleware
- Verify `REACT_APP_MEDIA_API_URL` points to the middleware
- Check middleware is running on `MIDDLEWARE_PORT`
- Ensure no firewall blocks the connection

### Path Mapping Issues
- Run the middleware and check logs for path translation
- Test with `curl http://localhost:3001/media/paths` to see paths
- Verify files exist at translated paths
