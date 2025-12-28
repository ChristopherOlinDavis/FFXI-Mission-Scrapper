/**
 * Helper utility for manual HTML caching workflow
 * Use this to get cache filenames for URLs and save HTML manually
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate cache key (filename) for a URL
 */
export function getCacheKey(url) {
  return Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
}

/**
 * Get cache file path for a URL
 */
export function getCachePath(url) {
  const cacheDir = path.join(process.cwd(), 'cache');
  const cacheKey = getCacheKey(url);
  return path.join(cacheDir, `${cacheKey}.html`);
}

/**
 * Save HTML to cache
 */
export async function saveToCache(url, html) {
  const cacheDir = path.join(process.cwd(), 'cache');
  const cachePath = getCachePath(url);

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, html, 'utf-8');

  console.log(`✓ Saved to cache: ${path.basename(cachePath)}`);
  return cachePath;
}

/**
 * Check if URL is already cached
 */
export async function isCached(url) {
  const cachePath = getCachePath(url);
  try {
    await fs.access(cachePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List of URLs to scrape for each mission set
 */
export const MISSION_URLS = {
  'bastok-rank-ffxiclopedia': {
    name: 'Bastok Rank Missions (FFXIclopedia)',
    source: 'FFXIclopedia',
    urls: [
      // Category pages
      'https://ffxiclopedia.fandom.com/wiki/Category:Missions',
      'https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions',

      // Mission pages (Rank 1-3 to start)
      'https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report',
      'https://ffxiclopedia.fandom.com/wiki/The_Emissary_(Bastok)',
      'https://ffxiclopedia.fandom.com/wiki/The_President%27s_Gatekeepers',
      'https://ffxiclopedia.fandom.com/wiki/A_Geological_Survey',
      'https://ffxiclopedia.fandom.com/wiki/Fetichism',
      'https://ffxiclopedia.fandom.com/wiki/Wading_Beasts',
      'https://ffxiclopedia.fandom.com/wiki/The_Emissary',
      'https://ffxiclopedia.fandom.com/wiki/The_Chains_that_Bind_Us',
      'https://ffxiclopedia.fandom.com/wiki/Enter_the_Talekeeper',
    ]
  },
  'bastok-rank-bgwiki': {
    name: 'Bastok Rank Missions (BG Wiki)',
    source: 'BG Wiki',
    urls: [
      // Category pages
      'https://www.bg-wiki.com/ffxi/Category:Missions',
      'https://www.bg-wiki.com/ffxi/Category:Bastok_Missions',

      // Mission pages (Rank 1-3 to start)
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_1-1',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_1-2',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_1-3',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_2-1',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_2-2',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_2-3',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_3-1',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_3-2',
      'https://www.bg-wiki.com/ffxi/Bastok_Mission_3-3',
    ]
  },
  'sandoria-rank-ffxiclopedia': {
    name: 'San d\'Oria Rank Missions (FFXIclopedia)',
    source: 'FFXIclopedia',
    urls: [
      'https://ffxiclopedia.fandom.com/wiki/Category:San_d%27Oria_Missions',
      // Add mission pages as needed
    ]
  }
};

/**
 * Print instructions for manual caching
 */
export function printInstructions(missionSet = null) {
  const sets = missionSet
    ? { [missionSet]: MISSION_URLS[missionSet] }
    : MISSION_URLS;

  console.log('\n=== Manual HTML Caching Instructions ===\n');

  for (const [setId, setData] of Object.entries(sets)) {
    if (!setData) {
      console.log(`Error: Mission set "${missionSet}" not found.`);
      continue;
    }

    console.log(`\n📦 ${setData.name}`);
    console.log(`Source: ${setData.source}`);
    console.log(`URLs to scrape: ${setData.urls.length}\n`);

    setData.urls.forEach((url, index) => {
      const cacheKey = getCacheKey(url);
      const filename = `${cacheKey}.html`;

      console.log(`${index + 1}. ${url}`);
      console.log(`   Cache as: cache/${filename}`);
      console.log('');
    });
  }

  console.log('\n📝 Steps:');
  console.log('1. Visit each URL in your browser');
  console.log('2. Right-click → "Save Page As" → Save as "Webpage, Complete" or "HTML Only"');
  console.log('3. Rename the file to the "Cache as" filename shown above');
  console.log('4. Move to the cache/ directory');
  console.log('5. Run the scraper with: node src/index.js scrape --set <mission-set>\n');
}

/**
 * Check cache status for a mission set
 */
export async function checkCacheStatus(missionSet) {
  const setData = MISSION_URLS[missionSet];

  if (!setData) {
    console.log(`Error: Mission set "${missionSet}" not found.`);
    return;
  }

  console.log(`\n📊 Cache Status: ${setData.name}\n`);

  let cachedCount = 0;
  let missingCount = 0;

  for (const url of setData.urls) {
    const cached = await isCached(url);
    const status = cached ? '✓' : '✗';
    const label = cached ? 'CACHED' : 'MISSING';

    if (cached) cachedCount++;
    else missingCount++;

    const urlShort = url.replace('https://ffxiclopedia.fandom.com/wiki/', '')
                        .replace('https://www.bg-wiki.com/ffxi/', '');

    console.log(`${status} [${label}] ${urlShort}`);
  }

  console.log(`\nTotal: ${cachedCount}/${setData.urls.length} cached`);

  if (missingCount > 0) {
    console.log(`\n⚠️  Missing ${missingCount} file(s). Run with --list to see URLs.\n`);
  } else {
    console.log(`\n✓ All files cached! Ready to scrape.\n`);
  }
}

/**
 * Save HTML from stdin (for piping)
 */
export async function saveFromStdin(url) {
  const chunks = [];

  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const html = chunks.join('');

  if (!html.trim()) {
    console.error('Error: No HTML content received from stdin');
    process.exit(1);
  }

  await saveToCache(url, html);
  console.log(`✓ Successfully cached ${url}`);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  switch (command) {
    case 'list':
      printInstructions(param);
      break;

    case 'status':
      if (!param) {
        console.log('Usage: node manual-cache-helper.js status <mission-set>');
        console.log('Available sets:', Object.keys(MISSION_URLS).join(', '));
      } else {
        await checkCacheStatus(param);
      }
      break;

    case 'save':
      if (!param) {
        console.log('Usage: node manual-cache-helper.js save <url>');
        console.log('Then paste HTML and press Ctrl+D (Unix) or Ctrl+Z (Windows)');
      } else {
        await saveFromStdin(param);
      }
      break;

    case 'filename':
      if (!param) {
        console.log('Usage: node manual-cache-helper.js filename <url>');
      } else {
        console.log(getCacheKey(param) + '.html');
      }
      break;

    default:
      console.log('\n🛠️  Manual Cache Helper\n');
      console.log('Commands:');
      console.log('  list [mission-set]    - Show URLs and cache filenames');
      console.log('  status <mission-set>  - Check which files are cached');
      console.log('  save <url>            - Save HTML from stdin');
      console.log('  filename <url>        - Get cache filename for URL');
      console.log('\nExamples:');
      console.log('  node src/utils/manual-cache-helper.js list bastok-rank-ffxiclopedia');
      console.log('  node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia');
      console.log('  cat page.html | node src/utils/manual-cache-helper.js save <url>');
      console.log('');
  }
}
