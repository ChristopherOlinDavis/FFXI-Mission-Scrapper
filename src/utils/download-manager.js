/**
 * URL Discovery and Download Manager
 *
 * Workflow:
 * 1. Start with seed URLs (category pages)
 * 2. Download HTML for each URL to outputHTMLs/
 * 3. Parse category pages to discover mission URLs
 * 4. Download mission pages
 * 5. Parse mission pages for data
 */

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import { discoverMissionSet, discoverAll } from './link-parser.js';

const OUTPUT_DIR = path.join(process.cwd(), 'outputHTMLs');
const URL_LIST_FILE = path.join(process.cwd(), 'url-list.json');

/**
 * Default URL List Structure (used if url-list.json doesn't exist)
 */
const DEFAULT_URLS = {
  'ffxiclopedia-bastok': {
    name: 'FFXIclopedia - Bastok Missions',
    source: 'FFXIclopedia',
    categoryPages: [
      'https://ffxiclopedia.fandom.com/wiki/Category:Missions',
      'https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions',
    ],
    missionPages: [],
  },
  'bgwiki-bastok': {
    name: 'BG Wiki - Bastok Missions',
    source: 'BG Wiki',
    categoryPages: [
      'https://www.bg-wiki.com/ffxi/Category:Missions',
      'https://www.bg-wiki.com/ffxi/Category:Bastok_Missions',
    ],
    missionPages: [],
  },
  'ffxiclopedia-sandoria': {
    name: 'FFXIclopedia - San d\'Oria Missions',
    source: 'FFXIclopedia',
    categoryPages: [
      'https://ffxiclopedia.fandom.com/wiki/Category:Missions',
      'https://ffxiclopedia.fandom.com/wiki/Category:San_d%27Oria_Missions',
    ],
    missionPages: [],
  },
  'ffxiclopedia-windurst': {
    name: 'FFXIclopedia - Windurst Missions',
    source: 'FFXIclopedia',
    categoryPages: [
      'https://ffxiclopedia.fandom.com/wiki/Category:Missions',
      'https://ffxiclopedia.fandom.com/wiki/Category:Windurst_Missions',
    ],
    missionPages: [],
  },
};

/**
 * Generate safe filename from URL
 */
export function urlToFilename(url) {
  // Remove protocol
  let filename = url.replace(/^https?:\/\//, '');
  // Replace special characters with underscores
  filename = filename.replace(/[^a-zA-Z0-9]/g, '_');
  // Add .html extension
  return `${filename}.html`;
}

/**
 * Download HTML from URL and save to outputHTMLs/
 */
export async function downloadHTML(url, options = {}) {
  const { headless = true, timeout = 60000 } = options;

  const filename = urlToFilename(url);
  const filepath = path.join(OUTPUT_DIR, filename);

  // Check if already downloaded
  try {
    await fs.access(filepath);
    console.log(`✓ Already downloaded: ${filename}`);
    return { url, filename, filepath, status: 'cached' };
  } catch {
    // File doesn't exist, proceed with download
  }

  console.log(`📥 Downloading: ${url}`);

  let browser;
  try {
    browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Wait for main content
    try {
      await page.waitForSelector('.mw-parser-output, .page-content', { timeout: 10000 });
    } catch (e) {
      console.warn('Main content selector not found, continuing...');
    }

    const html = await page.content();
    await browser.close();

    // Save to outputHTMLs/
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(filepath, html, 'utf-8');

    console.log(`✓ Downloaded: ${filename}`);
    return { url, filename, filepath, status: 'downloaded' };

  } catch (error) {
    if (browser) await browser.close();
    console.error(`✗ Failed to download ${url}:`, error.message);
    return { url, filename, filepath, status: 'error', error: error.message };
  }
}

/**
 * Download all URLs from a list
 */
export async function downloadAllURLs(urls, options = {}) {
  const { delayMs = 2000, onProgress = null } = options;

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    const result = await downloadHTML(url, options);
    results.push(result);

    if (onProgress) {
      onProgress({
        completed: i + 1,
        total: urls.length,
        url,
        status: result.status,
      });
    }

    // Delay between requests (except for last one)
    if (i < urls.length - 1) {
      console.log(`⏳ Waiting ${delayMs}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Load URL list from file
 */
export async function loadURLList() {
  try {
    const content = await fs.readFile(URL_LIST_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return default URLs
    console.warn(`⚠️  ${URL_LIST_FILE} not found, using defaults`);
    return DEFAULT_URLS;
  }
}

/**
 * Save URL list to file
 */
export async function saveURLList(urlList) {
  await fs.writeFile(URL_LIST_FILE, JSON.stringify(urlList, null, 2), 'utf-8');
  console.log(`✓ Saved URL list to ${URL_LIST_FILE}`);
}

/**
 * List all URLs that need to be downloaded
 */
export function getAllURLs(urlList) {
  const allUrls = [];

  for (const [setId, setData] of Object.entries(urlList)) {
    allUrls.push(...setData.categoryPages);
    allUrls.push(...setData.missionPages);
  }

  return [...new Set(allUrls)]; // Remove duplicates
}

/**
 * Check download status
 */
export async function checkDownloadStatus(urls) {
  const status = {
    downloaded: [],
    missing: [],
    total: urls.length,
  };

  for (const url of urls) {
    const filename = urlToFilename(url);
    const filepath = path.join(OUTPUT_DIR, filename);

    try {
      await fs.access(filepath);
      status.downloaded.push({ url, filename });
    } catch {
      status.missing.push({ url, filename });
    }
  }

  return status;
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      // Initialize url-list.json if it doesn't exist
      try {
        await fs.access(URL_LIST_FILE);
        console.log(`✓ ${URL_LIST_FILE} already exists`);
      } catch {
        await saveURLList(DEFAULT_URLS);
        console.log(`✓ Created ${URL_LIST_FILE} with default URLs`);
      }
      break;

    case 'list':
      const urlList = await loadURLList();
      const allUrls = getAllURLs(urlList);
      console.log('\n📋 All URLs to Download:\n');
      allUrls.forEach((url, i) => {
        console.log(`${i + 1}. ${url}`);
        console.log(`   → ${urlToFilename(url)}\n`);
      });
      console.log(`Total: ${allUrls.length} URLs\n`);
      break;

    case 'status':
      const urlListStatus = await loadURLList();
      const allUrlsStatus = getAllURLs(urlListStatus);
      const downloadStatus = await checkDownloadStatus(allUrlsStatus);

      console.log('\n📊 Download Status:\n');
      console.log(`Downloaded: ${downloadStatus.downloaded.length}/${downloadStatus.total}`);
      console.log(`Missing: ${downloadStatus.missing.length}/${downloadStatus.total}\n`);

      if (downloadStatus.downloaded.length > 0) {
        console.log('✓ Downloaded:');
        downloadStatus.downloaded.forEach(({ url, filename }) => {
          console.log(`  ${filename}`);
        });
        console.log('');
      }

      if (downloadStatus.missing.length > 0) {
        console.log('✗ Missing:');
        downloadStatus.missing.forEach(({ url, filename }) => {
          console.log(`  ${url}`);
        });
        console.log('');
      }
      break;

    case 'download':
      const setId = args[1] || 'all';
      const urlListDownload = await loadURLList();

      let urlsToDownload;
      if (setId === 'all') {
        urlsToDownload = getAllURLs(urlListDownload);
      } else if (urlListDownload[setId]) {
        const setData = urlListDownload[setId];
        urlsToDownload = [...setData.categoryPages, ...setData.missionPages];
      } else {
        console.error(`Error: Mission set "${setId}" not found.`);
        console.log('Available sets:', Object.keys(urlListDownload).join(', '));
        process.exit(1);
      }

      console.log(`\n🚀 Downloading ${urlsToDownload.length} URLs...\n`);

      const downloadResults = await downloadAllURLs(urlsToDownload, {
        delayMs: 2000,
        onProgress: ({ completed, total, url, status }) => {
          console.log(`[${completed}/${total}] ${status}: ${url}`);
        },
      });

      const successCount = downloadResults.filter(r => r.status === 'downloaded' || r.status === 'cached').length;
      const errorCount = downloadResults.filter(r => r.status === 'error').length;

      console.log(`\n✓ Complete: ${successCount} successful, ${errorCount} errors\n`);
      break;

    case 'discover':
      const discoverSetId = args[1] || 'all';

      console.log('\n🔍 Discovering mission URLs from category pages...\n');

      if (discoverSetId === 'all') {
        await discoverAll();
      } else {
        const urlListDiscover = await loadURLList();
        if (!urlListDiscover[discoverSetId]) {
          console.error(`Error: Mission set "${discoverSetId}" not found.`);
          console.log('Available sets:', Object.keys(urlListDiscover).join(', '));
          process.exit(1);
        }
        await discoverMissionSet(discoverSetId);
      }

      console.log('💡 Next steps:');
      console.log('  1. Run "node src/utils/download-manager.js list" to see new URLs');
      console.log('  2. Run "node src/utils/download-manager.js download <set>" to download mission pages\n');
      break;

    default:
      console.log('\n📦 Download Manager\n');
      console.log('Commands:');
      console.log('  init                - Initialize url-list.json (optional, auto-created if needed)');
      console.log('  list                - Show all URLs to download');
      console.log('  status              - Check download status');
      console.log('  download [set]      - Download URLs (set: all, ffxiclopedia-bastok, etc.)');
      console.log('  discover [set]      - Discover mission URLs from category pages');
      console.log('\nExamples:');
      console.log('  node src/utils/download-manager.js init');
      console.log('  node src/utils/download-manager.js list');
      console.log('  node src/utils/download-manager.js status');
      console.log('  node src/utils/download-manager.js download all');
      console.log('  node src/utils/download-manager.js download ffxiclopedia-bastok');
      console.log('  node src/utils/download-manager.js discover ffxiclopedia-bastok');
      console.log('  node src/utils/download-manager.js discover all');
      console.log('');
  }
}
