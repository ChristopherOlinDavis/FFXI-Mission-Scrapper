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
 * Returns { links: [], nextPageUrl: null }
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

  // Extract pagination "next page" link
  let nextPageUrl = null;
  const $nextLink = $('#mw-pages a:contains("next page")');
  if ($nextLink.length > 0) {
    const href = $nextLink.attr('href');
    if (href) {
      // Convert relative URL to absolute
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        nextPageUrl = `${base.protocol}//${base.host}${href}`;
      } else {
        nextPageUrl = href;
      }
    }
  }

  return { links, nextPageUrl };
}

/**
 * Discover mission URLs from a category page (with pagination support)
 */
export async function discoverMissionURLs(categoryUrl) {
  console.log(`\n📖 Parsing: ${categoryUrl}`);

  const html = await readHTML(categoryUrl);
  let allLinks = [];
  let nextPageUrl = null;

  // Determine which parser to use based on URL
  if (categoryUrl.includes('ffxiclopedia.fandom.com')) {
    allLinks = parseFFXIclopediaCategoryPage(html, categoryUrl);
  } else if (categoryUrl.includes('bg-wiki.com')) {
    const result = parseBGWikiCategoryPage(html, categoryUrl);
    allLinks = result.links;
    nextPageUrl = result.nextPageUrl;
  }

  console.log(`   Found ${allLinks.length} mission links on this page`);

  // Handle pagination for BG Wiki
  if (nextPageUrl) {
    console.log(`   📄 Pagination detected, will need to fetch additional pages`);
    console.log(`      Next page: ${nextPageUrl}`);
  }

  return { links: allLinks, nextPageUrl };
}

/**
 * Fetch paginated category page from web (for BG Wiki pagination)
 */
async function fetchPaginatedPage(url) {
  const playwright = await import('playwright');
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    await browser.close();
    return html;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Discover all mission URLs for a mission set (with pagination support)
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

  // Build set of all existing URLs across all sets to avoid duplicates
  const globalSeenUrls = new Set();
  for (const [existingSetId, existingSetData] of Object.entries(urlList)) {
    // Add category pages from all sets
    for (const url of existingSetData.categoryPages) {
      globalSeenUrls.add(url);
    }
    // Only add mission pages from other sets (not current one, since we're regenerating)
    if (existingSetId !== setId) {
      for (const url of existingSetData.missionPages) {
        globalSeenUrls.add(url);
      }
    }
  }

  let duplicatesSkipped = 0;

  // Parse each category page
  for (const categoryUrl of setData.categoryPages) {
    try {
      const result = await discoverMissionURLs(categoryUrl);

      // Add unique links from first page
      for (const link of result.links) {
        if (!seenUrls.has(link.url)) {
          // Check if URL exists in other sets
          if (globalSeenUrls.has(link.url)) {
            console.log(`   ⚠️  Skipping duplicate URL (exists in another set): ${link.title}`);
            duplicatesSkipped++;
          } else {
            seenUrls.add(link.url);
            globalSeenUrls.add(link.url);
            allLinks.push(link);
          }
        }
      }

      // Handle pagination (BG Wiki specific)
      let nextPageUrl = result.nextPageUrl;
      let pageNum = 2;
      const MAX_PAGES = 10; // Safety limit to prevent infinite loops

      while (nextPageUrl && pageNum <= MAX_PAGES) {
        console.log(`\n📖 Fetching page ${pageNum}: ${nextPageUrl}`);

        try {
          const html = await fetchPaginatedPage(nextPageUrl);
          const pageResult = parseBGWikiCategoryPage(html, nextPageUrl);

          console.log(`   Found ${pageResult.links.length} mission links on page ${pageNum}`);

          // Add unique links
          for (const link of pageResult.links) {
            if (!seenUrls.has(link.url)) {
              // Check if URL exists in other sets
              if (globalSeenUrls.has(link.url)) {
                console.log(`   ⚠️  Skipping duplicate URL (exists in another set): ${link.title}`);
                duplicatesSkipped++;
              } else {
                seenUrls.add(link.url);
                globalSeenUrls.add(link.url);
                allLinks.push(link);
              }
            }
          }

          nextPageUrl = pageResult.nextPageUrl;
          pageNum++;
        } catch (error) {
          console.error(`✗ Error fetching page ${pageNum}:`, error.message);
          break;
        }
      }

      if (pageNum > MAX_PAGES) {
        console.log(`\n⚠️  Reached maximum page limit (${MAX_PAGES}), stopping pagination`);
      }

    } catch (error) {
      console.error(`✗ Error parsing ${categoryUrl}:`, error.message);
    }
  }

  // Update url-list.json with discovered URLs (deduplicated)
  setData.missionPages = [...new Set(allLinks.map(l => l.url))]; // Extra safety deduplication
  await saveURLList(urlList);

  console.log(`\n✓ Discovered ${allLinks.length} unique mission URLs`);
  if (duplicatesSkipped > 0) {
    console.log(`⚠️  Skipped ${duplicatesSkipped} duplicate URLs that exist in other sets`);
  }
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
          const result = await discoverMissionURLs(setId);
          console.log('\nDiscovered links:');
          result.links.forEach((link, i) => {
            console.log(`${i + 1}. ${link.title}`);
            console.log(`   ${link.url}`);
          });
          if (result.nextPageUrl) {
            console.log(`\n📄 Next page available: ${result.nextPageUrl}`);
          }
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
