const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Load .env file only if it exists (for local development)
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const app = express();

const STASH_URL = process.env.STASH_URL || 'http://192.168.1.75:9999';
const STASH_API_KEY = process.env.STASH_API_KEY || '';
const PORT = process.env.MIDDLEWARE_PORT || 3001;
const GROUP_NAMES = (process.env.GROUP_NAMES || 'Erin')
  .split(',')
  .map(name => name.trim())
  .filter(name => name.length > 0);

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
        files {
          basename
          duration
          width
          height
        }
        paths {
          screenshot
          stream
        }
        tags {
          name
        }
        performers {
          name
        }
        studio {
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

async function fetchGroupScenes(groupName) {
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
      const filename = primaryFile?.basename || `Scene ${scene.id}`;
      
      const title = scene.title || filename.replace(/\.[^/.]+$/, '')
        .replaceAll('-', ' ')
        .replaceAll('_', ' ');

      return {
        // Use Stash's streaming endpoint directly
        url: `${STASH_URL}/scene/${scene.id}/stream`,
        filename: filename,
        title: title,
        extension: 'mp4', // Stash transcodes to mp4
        playlist: groupName,
        metadataURL: false,
        _erin: {
          stashId: scene.id,
          stashGroup: groupName,
          screenshot: scene.paths?.screenshot,
          date: scene.date,
          rating: scene.rating100,
          duration: primaryFile?.duration,
          width: primaryFile?.width,
          height: primaryFile?.height,
          studio: scene.studio?.name,
          performers: scene.performers?.map(p => p.name) || [],
          tags: scene.tags?.map(t => t.name) || [],
        },
      };
    })
    .filter(video => video !== null);

  return videos;
}

// Main endpoint - returns video list with Stash streaming URLs
app.get('/media/', async (req, res) => {
  try {
    console.log(
      `Fetching scenes from ${GROUP_NAMES.length} Stash group(s): ${GROUP_NAMES.join(', ')}`
    );

    const groupPromises = GROUP_NAMES.map(groupName =>
      fetchGroupScenes(groupName).catch(error => {
        console.error(`Error fetching group "${groupName}":`, error);
        return [];
      })
    );

    const groupResults = await Promise.all(groupPromises);
    const allVideos = groupResults.flat();

    console.log(
      `Returning ${allVideos.length} total videos from ${GROUP_NAMES.length} group(s)`
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    stashUrl: STASH_URL,
    groups: GROUP_NAMES
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Stash middleware listening on port ${PORT}`);
  console.log(`Stash URL: ${STASH_URL}`);
  console.log(`Groups: ${GROUP_NAMES.join(', ')}`);
});
