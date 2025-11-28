const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

const STASH_URL = process.env.STASH_URL || 'http://192.168.1.75:9999';
const STASH_API_KEY = process.env.STASH_API_KEY || '';
const PORT = process.env.MIDDLEWARE_PORT || 3001;
const GROUP_NAMES = (process.env.GROUP_NAMES || 'Erin')
  .split(',')
  .map(name => name.trim())
  .filter(name => name.length > 0);
const STASH_PATH_PREFIX = process.env.STASH_PATH_PREFIX || '/data';
const ERIN_PATH_PREFIX = process.env.ERIN_PATH_PREFIX || '/Volumes/archive/Media';

app.use(cors());
app.use(express.json());

const FIND_GROUP_QUERY = `
  query FindGroup($name: String!) {
    findGroups(
      group_filter: { name: { value: $name, modifier: EQUALS } }
    ) {
      groups {
        id
        name
      }
    }
  }
`;

const GET_GROUP_SCENES_QUERY = `
  query GetGroupScenes($groupId: ID!) {
    findGroup(id: $groupId) {
      id
      name
      scenes {
        id
        title
        details
        date
        rating100
        organized
        files {
          id
          path
          size
          duration
          width
          height
          video_codec
          basename
        }
        paths {
          screenshot
          preview
          stream
          webp
        }
        tags {
          id
          name
        }
        performers {
          id
          name
        }
        studio {
          id
          name
        }
      }
    }
  }
`;

async function queryStash(query, variables = {}) {
  try {
    const response = await fetch(`${STASH_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(STASH_API_KEY && { ApiKey: STASH_API_KEY }),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Stash API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('Error querying Stash:', error);
    throw error;
  }
}

function convertPath(stashPath) {
  if (!stashPath) return null;

  if (stashPath.startsWith(STASH_PATH_PREFIX)) {
    return stashPath.replace(STASH_PATH_PREFIX, ERIN_PATH_PREFIX);
  }

  console.warn(`Path doesn't start with expected prefix ${STASH_PATH_PREFIX}: ${stashPath}`);
  return stashPath;
}

async function fetchGroupScenes(groupName, req) {
  console.log(`Fetching scenes from Stash group: "${groupName}"`);

  const groupData = await queryStash(FIND_GROUP_QUERY, { name: groupName });

  if (!groupData.findGroups.groups || groupData.findGroups.groups.length === 0) {
    console.warn(`Group "${groupName}" not found in Stash`);
    return [];
  }

  const group = groupData.findGroups.groups[0];
  console.log(`Found group "${group.name}" (ID: ${group.id})`);

  const scenesData = await queryStash(GET_GROUP_SCENES_QUERY, { groupId: group.id });

  if (!scenesData.findGroup || !scenesData.findGroup.scenes) {
    return [];
  }

  const scenes = scenesData.findGroup.scenes;
  console.log(`Found ${scenes.length} scenes in group "${groupName}"`);

  const videos = scenes
    .map(scene => {
      const primaryFile = scene.files[0];

      if (!primaryFile || !primaryFile.path) {
        console.warn(`Scene ${scene.id} has no valid file path`);
        return null;
      }

      const erinPath = convertPath(primaryFile.path);
      if (!erinPath) {
        console.warn(`Could not convert path for scene ${scene.id}`);
        return null;
      }

      const filename = primaryFile.basename || erinPath.split('/').pop();
      const relativePathWithFile = erinPath.replace(ERIN_PATH_PREFIX, '').replace(/^\//, '');

      const title =
        scene.title ||
        filename
          .replace(/\.[^/.]+$/, '')
          .replaceAll('-', ' ')
          .replaceAll('_', ' ')
          .replaceAll('__', ' - ');

      return {
        url: `${req.protocol}://${req.get('host')}/media/${relativePathWithFile}`,
        filename: filename,
        title: title,
        extension: filename.split('.').pop().toLowerCase(),
        playlist: groupName,
        metadataURL: false,
        _erin: {
          stashId: scene.id,
          stashGroup: groupName,
          originalPath: primaryFile.path,
          convertedPath: erinPath,
          relativePath: relativePathWithFile,
          date: scene.date,
          rating: scene.rating100,
          duration: primaryFile.duration,
          width: primaryFile.width,
          height: primaryFile.height,
          codec: primaryFile.video_codec,
          studio: scene.studio?.name,
          performers: scene.performers?.map(p => p.name) || [],
          tags: scene.tags?.map(t => t.name) || [],
        },
      };
    })
    .filter(video => video !== null);

  return videos;
}

app.get('/media/', async (req, res) => {
  try {
    console.log(
      `Fetching scenes from ${GROUP_NAMES.length} Stash group(s): ${GROUP_NAMES.join(', ')}`
    );

    const groupPromises = GROUP_NAMES.map(groupName =>
      fetchGroupScenes(groupName, req).catch(error => {
        console.error(`Error fetching group "${groupName}":`, error);
        return [];
      })
    );

    const groupResults = await Promise.all(groupPromises);
    const allVideos = groupResults.flat();

    console.log(
      `Returning ${allVideos.length} total videos from ${GROUP_NAMES.length} playlist(s)`
    );
    res.json(allVideos);
  } catch (error) {
    console.error('Error in /media/ endpoint:', error);
    res.status(500).json({
      error: error.message,
      hint: 'Check Stash connection and API key',
    });
  }
});

app.get('/media/paths', async (req, res) => {
  try {
    console.log(`Fetching file paths from Stash groups: ${GROUP_NAMES.join(', ')}`);

    const allPaths = [];

    for (const groupName of GROUP_NAMES) {
      const groupData = await queryStash(FIND_GROUP_QUERY, { name: groupName });

      if (!groupData.findGroups.groups || groupData.findGroups.groups.length === 0) {
        console.warn(`Group "${groupName}" not found in Stash`);
        continue;
      }

      const group = groupData.findGroups.groups[0];
      const scenesData = await queryStash(GET_GROUP_SCENES_QUERY, { groupId: group.id });

      if (!scenesData.findGroup || !scenesData.findGroup.scenes) {
        continue;
      }

      const scenes = scenesData.findGroup.scenes;
      const paths = scenes
        .filter(scene => scene.files[0]?.path)
        .map(scene => ({
          group: groupName,
          sceneId: scene.id,
          title: scene.title,
          stashPath: scene.files[0].path,
          erinPath: convertPath(scene.files[0].path),
          filename: scene.files[0].basename,
        }));

      allPaths.push(...paths);
    }

    res.json(allPaths);
  } catch (error) {
    console.error('Error in /media/paths endpoint:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/media/*', (req, res) => {
  try {
    let requestedPath = req.params[0].replace(/^\.\//, '');
    const absolutePath = `${ERIN_PATH_PREFIX}/${requestedPath}`;

    console.log(`Streaming file: ${requestedPath} -> ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      console.error(`File not found: ${absolutePath}`);
      return res
        .status(404)
        .json({ error: 'File not found', requested: requestedPath, path: absolutePath });
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(absolutePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(absolutePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming file:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    stashUrl: STASH_URL,
    groupNames: GROUP_NAMES,
    groupCount: GROUP_NAMES.length,
    hasApiKey: !!STASH_API_KEY,
    pathMapping: {
      stashPrefix: STASH_PATH_PREFIX,
      erinPrefix: ERIN_PATH_PREFIX,
    },
  });
});

app.get('/test-stash', async (req, res) => {
  try {
    const testQuery = `{ configuration { general { stashes { path } } } }`;
    const data = await queryStash(testQuery);

    res.json({
      success: true,
      message: 'Successfully connected to Stash',
      stashConfig: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Stash-Erin Middleware Server');
  console.log('='.repeat(50));
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Stash URL: ${STASH_URL}`);
  console.log(`Groups (${GROUP_NAMES.length} playlists):`);
  GROUP_NAMES.forEach((name, index) => {
    console.log(`  ${index + 1}. "${name}"`);
  });
  console.log(`API Key configured: ${STASH_API_KEY ? 'Yes' : 'No'}`);
  console.log('='.repeat(50));
  console.log('\nPath Mapping:');
  console.log(`  Stash prefix: ${STASH_PATH_PREFIX}`);
  console.log(`  Erin prefix:  ${ERIN_PATH_PREFIX}`);
  console.log('='.repeat(50));
  console.log('\nEndpoints:');
  console.log(`  GET /health          - Health check`);
  console.log(`  GET /test-stash      - Test Stash connection`);
  console.log(`  GET /media/          - Get videos from all groups as playlists`);
  console.log(`  GET /media/paths     - Get file paths (debug)`);
  console.log('='.repeat(50));
});
