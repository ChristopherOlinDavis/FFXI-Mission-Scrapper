/**
 * HTML Parser - Discovers mission URLs from downloaded category pages
 */

import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { urlToFilename } from './download-manager.js';

const OUTPUT_DIR = path.join(process.cwd(), 'outputHTMLs');
const URL_LIST_FILE = path.join(process.cwd(), 'url-list.json');

/**
 * Load URL list
 */
async function loadURLList() {
  try {
    const content = await fs.readFile(URL_LIST_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${URL_LIST_FILE} not found. Run "node src/utils/download-manager.js list" first to initialize.`);
  }
}

/**
 * Save URL list
 */
async function saveURLList(urlList) {
  await fs.writeFile(URL_LIST_FILE, JSON.stringify(urlList, null, 2), 'utf-8');
}

/**
 * Read HTML file from outputHTMLs/
 */
async function readHTML(url) {
  const filename = urlToFilename(url);
  const filepath = path.join(OUTPUT_DIR, filename);

  try {
    return await fs.readFile(filepath, 'utf-8');
  } catch (error) {
    throw new Error(`HTML not found for ${url}. Run download first.`);
  }
}

/**
 * Parse FFXIclopedia category page to find mission links
 */
function parseFFXIclopediaCategoryPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];

  // FFXIclopedia uses .category-page__member-link for mission links
  $('.category-page__member-link').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const title = $link.text().trim();

    if (href && title) {
      // Convert relative URL to absolute
      let fullUrl = href;
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        fullUrl = `${base.protocol}//${base.host}${href}`;
      }

      // Filter for mission pages (exclude category pages and special pages)
      if (!fullUrl.includes('Category:') &&
          !fullUrl.includes('Special:') &&
          !fullUrl.includes('File:')) {
        links.push({
          url: fullUrl,
          title: title,
        });
      }
    }
  });

  return links;
}

/**
 * Parse BG Wiki category page to find mission links
 */
function parseBGWikiCategoryPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];
  const seenUrls = new Set();

  // Method 1: Extract from mission table (more structured)
  // BG Wiki mission category pages often have a table with mission data
  $('table tr').each((i, row) => {
    const $row = $(row);
    // Look for rows with mission links (skip header rows)
    const $missionLink = $row.find('td a[href*="Mission"]');

    if ($missionLink.length > 0) {
      const href = $missionLink.attr('href');
      const title = $missionLink.text().trim();

      if (href && title && !seenUrls.has(href)) {
        // Convert relative URL to absolute
        let fullUrl = href;
        if (href.startsWith('/')) {
          const base = new URL(baseUrl);
          fullUrl = `${base.protocol}//${base.host}${href}`;
        }

        // Filter for mission pages
        if (!fullUrl.includes('Category:') &&
            !fullUrl.includes('Special:')) {
          links.push({
            url: fullUrl,
            title: title,
          });
          seenUrls.add(href);
        }
      }
    }
  });

  // Method 2: Extract from category listing at bottom (fallback)
  // BG Wiki uses #mw-pages .mw-category-group for mission listings
  $('#mw-pages .mw-category-group li a').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const title = $link.text().trim();

    if (href && title && !seenUrls.has(href)) {
      // Convert relative URL to absolute
      let fullUrl = href;
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        fullUrl = `${base.protocol}//${base.host}${href}`;
      }

      // Filter for mission pages
      if (!fullUrl.includes('Category:') &&
          !fullUrl.includes('Special:')) {
        links.push({
          url: fullUrl,
          title: title,
        });
        seenUrls.add(href);
      }
    }
  });

  return links;
}

/**
 * Discover mission URLs from a category page
 */
export async function discoverMissionURLs(categoryUrl) {
  console.log(`\n📖 Parsing: ${categoryUrl}`);

  const html = await readHTML(categoryUrl);

  let links = [];

  // Determine which parser to use based on URL
  if (categoryUrl.includes('ffxiclopedia.fandom.com')) {
    links = parseFFXIclopediaCategoryPage(html, categoryUrl);
  } else if (categoryUrl.includes('bg-wiki.com')) {
    links = parseBGWikiCategoryPage(html, categoryUrl);
  }

  console.log(`   Found ${links.length} mission links`);

  return links;
}

/**
 * Discover all mission URLs for a mission set
 */
export async function discoverMissionSet(setId) {
  const urlList = await loadURLList();
  const setData = urlList[setId];

  if (!setData) {
    throw new Error(`Mission set "${setId}" not found`);
  }

  console.log(`\n🔍 Discovering missions for: ${setData.name}`);

  const allLinks = [];
  const seenUrls = new Set();

  // Parse each category page
  for (const categoryUrl of setData.categoryPages) {
    try {
      const links = await discoverMissionURLs(categoryUrl);

      // Add unique links
      for (const link of links) {
        if (!seenUrls.has(link.url)) {
          seenUrls.add(link.url);
          allLinks.push(link);
        }
      }
    } catch (error) {
      console.error(`✗ Error parsing ${categoryUrl}:`, error.message);
    }
  }

  // Update url-list.json with discovered URLs
  setData.missionPages = allLinks.map(l => l.url);
  await saveURLList(urlList);

  console.log(`\n✓ Discovered ${allLinks.length} unique mission URLs`);
  console.log(`✓ Updated ${URL_LIST_FILE}\n`);

  // Show discovered URLs
  console.log('Discovered missions:');
  allLinks.forEach((link, i) => {
    console.log(`  ${i + 1}. ${link.title}`);
    console.log(`     ${link.url}`);
  });
  console.log('');

  return allLinks;
}

/**
 * Discover URLs for all mission sets
 */
export async function discoverAll() {
  const urlList = await loadURLList();
  const results = {};

  for (const setId of Object.keys(urlList)) {
    try {
      results[setId] = await discoverMissionSet(setId);
    } catch (error) {
      console.error(`✗ Error discovering ${setId}:`, error.message);
      results[setId] = [];
    }
  }

  return results;
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const setId = args[1];

  try {
    switch (command) {
      case 'discover':
        if (setId === 'all') {
          await discoverAll();
        } else if (setId) {
          await discoverMissionSet(setId);
        } else {
          console.log('Usage: node src/utils/link-parser.js discover <set-id|all>');
          console.log('Example: node src/utils/link-parser.js discover ffxiclopedia-bastok');
        }
        break;

      case 'test':
        // Test parsing a single category URL
        if (!setId) {
          console.log('Usage: node src/utils/link-parser.js test <url>');
        } else {
          const links = await discoverMissionURLs(setId);
          console.log('\nDiscovered links:');
          links.forEach((link, i) => {
            console.log(`${i + 1}. ${link.title}`);
            console.log(`   ${link.url}`);
          });
        }
        break;

      default:
        console.log('\n🔗 Link Parser\n');
        console.log('Commands:');
        console.log('  discover <set-id|all>  - Discover mission URLs from category pages');
        console.log('  test <url>             - Test parsing a single category URL');
        console.log('\nExamples:');
        console.log('  node src/utils/link-parser.js discover ffxiclopedia-bastok');
        console.log('  node src/utils/link-parser.js discover all');
        console.log('  node src/utils/link-parser.js test "https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions"');
        console.log('');
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}
