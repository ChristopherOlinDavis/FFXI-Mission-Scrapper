#!/usr/bin/env node

/**
 * URL List Merger and Enhancer
 *
 * Merges and de-duplicates URL lists from multiple sources:
 * - url-list.json (old format with mission sets)
 * - NewFFXIClopedia.json (scraped FFXIclopedia pages with links)
 * - New-URL-list.json (crawled BG-Wiki URLs with analysis)
 *
 * Outputs:
 * - unified-urls.json: Comprehensive de-duplicated URL list
 * - url-sources.json: Source tracking for each URL
 * - url-stats.json: Statistics about the merge
 */

import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const OLD_URL_LIST = path.join(ROOT_DIR, 'url-list.json');
const FFXICLOPEDIA_LIST = path.join(ROOT_DIR, 'NewFFXIClopedia.json');
const BGWIKI_LIST = path.join(ROOT_DIR, 'New-URL-list.json');

const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const UNIFIED_OUTPUT = path.join(OUTPUT_DIR, 'unified-urls.json');
const SOURCE_TRACKING = path.join(OUTPUT_DIR, 'url-sources.json');
const STATS_OUTPUT = path.join(OUTPUT_DIR, 'url-merge-stats.json');

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url) {
  if (!url) return null;

  try {
    // Remove trailing slashes, fragments, and normalize
    const normalized = url
      .trim()
      .replace(/#.*$/, '') // Remove fragments
      .replace(/\/$/, ''); // Remove trailing slash

    return normalized;
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`);
    return null;
  }
}

/**
 * Categorize URL by content type
 */
function categorizeUrl(url, title = '', analysis = '') {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const analysisLower = analysis.toLowerCase();

  const categories = [];

  // Mission categories
  if (urlLower.includes('/wiki/category:') && (urlLower.includes('mission') || titleLower.includes('mission'))) {
    categories.push('missions');
  }

  // Quest categories
  if (urlLower.includes('/wiki/category:') && (urlLower.includes('quest') || titleLower.includes('quest'))) {
    categories.push('quests');
  }

  // Bestiary
  if (urlLower.includes('bestiary') || urlLower.includes('monster') ||
      urlLower.includes('/wiki/category:') && (urlLower.includes('beast') || urlLower.includes('notorious'))) {
    categories.push('bestiary');
  }

  // Items
  if (urlLower.includes('item') || urlLower.includes('equipment') || urlLower.includes('weapon')) {
    categories.push('items');
  }

  // NPCs
  if (urlLower.includes('npc') || titleLower.includes('npc')) {
    categories.push('npcs');
  }

  // Jobs
  if (urlLower.includes('/wiki/category:jobs') || titleLower.includes('job')) {
    categories.push('jobs');
  }

  // Zones/Areas
  if (urlLower.includes('zone') || urlLower.includes('area') ||
      analysisLower.includes('zone') || analysisLower.includes('area')) {
    categories.push('zones');
  }

  // Records of Eminence
  if (urlLower.includes('records_of_eminence') || urlLower.includes('roe')) {
    categories.push('roe');
  }

  // Campaign
  if (urlLower.includes('campaign')) {
    categories.push('campaign');
  }

  // Assault
  if (urlLower.includes('assault')) {
    categories.push('assault');
  }

  // Default to general if no categories found
  if (categories.length === 0) {
    categories.push('general');
  }

  return categories;
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Load and parse old url-list.json
 */
async function loadOldUrlList() {
  console.log('📖 Loading old url-list.json...');

  try {
    const content = await fs.readFile(OLD_URL_LIST, 'utf-8');
    const data = JSON.parse(content);

    const urls = new Map();

    for (const [setId, setData] of Object.entries(data)) {
      // Add category pages
      if (setData.categoryPages) {
        for (const url of setData.categoryPages) {
          const normalized = normalizeUrl(url);
          if (normalized) {
            urls.set(normalized, {
              url: normalized,
              title: setData.name || setId,
              source: 'url-list.json',
              missionSet: setId,
              type: 'category',
              categories: ['missions'],
              metadata: {
                setName: setData.name,
                wikiSource: setData.source
              }
            });
          }
        }
      }

      // Add mission pages
      if (setData.missionPages) {
        for (const url of setData.missionPages) {
          const normalized = normalizeUrl(url);
          if (normalized) {
            // Extract mission name from URL
            const missionName = url.split('/wiki/').pop()?.replace(/_/g, ' ') || '';

            urls.set(normalized, {
              url: normalized,
              title: missionName,
              source: 'url-list.json',
              missionSet: setId,
              type: 'mission',
              categories: ['missions'],
              metadata: {
                setName: setData.name,
                wikiSource: setData.source
              }
            });
          }
        }
      }
    }

    console.log(`   Found ${urls.size} URLs from ${Object.keys(data).length} mission sets`);
    return urls;

  } catch (error) {
    console.error(`   ⚠️  Error loading old URL list: ${error.message}`);
    return new Map();
  }
}

/**
 * Load and parse NewFFXIClopedia.json
 */
async function loadFFXIclopediaList() {
  console.log('📖 Loading NewFFXIClopedia.json...');

  try {
    const content = await fs.readFile(FFXICLOPEDIA_LIST, 'utf-8');
    const data = JSON.parse(content);

    const urls = new Map();

    for (const page of data) {
      // Add the page itself
      const normalized = normalizeUrl(page.url);
      if (normalized) {
        const categories = categorizeUrl(normalized, page.title);

        urls.set(normalized, {
          url: normalized,
          title: page.title || '',
          source: 'NewFFXIClopedia.json',
          type: 'page',
          categories,
          metadata: {
            timestamp: page.timestamp,
            htmlSize: page.htmlSize,
            contentSnippet: page.contentSnippet?.substring(0, 200)
          }
        });
      }

      // Add all linked URLs
      if (page.links && Array.isArray(page.links)) {
        for (const linkUrl of page.links) {
          const normalizedLink = normalizeUrl(linkUrl);
          if (normalizedLink && !urls.has(normalizedLink)) {
            const categories = categorizeUrl(normalizedLink);

            urls.set(normalizedLink, {
              url: normalizedLink,
              title: '',
              source: 'NewFFXIClopedia.json',
              type: 'link',
              categories,
              metadata: {
                foundOnPage: page.url,
                foundOnPageTitle: page.title
              }
            });
          }
        }
      }
    }

    console.log(`   Found ${urls.size} URLs from ${data.length} pages`);
    return urls;

  } catch (error) {
    console.error(`   ⚠️  Error loading FFXIclopedia list: ${error.message}`);
    return new Map();
  }
}

/**
 * Load and parse New-URL-list.json
 */
async function loadBGWikiList() {
  console.log('📖 Loading New-URL-list.json...');

  try {
    const content = await fs.readFile(BGWIKI_LIST, 'utf-8');
    const data = JSON.parse(content);

    const urls = new Map();

    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const normalized = normalizeUrl(result.url);
        if (normalized) {
          let analysis = {};
          try {
            if (result.analysis && typeof result.analysis === 'string') {
              analysis = JSON.parse(result.analysis);
            }
          } catch {
            // Ignore parse errors
          }

          const categories = categorizeUrl(
            normalized,
            result.title || '',
            analysis.summary || ''
          );

          urls.set(normalized, {
            url: normalized,
            title: result.title || '',
            source: 'New-URL-list.json',
            type: 'crawled',
            categories,
            metadata: {
              timestamp: result.timestamp,
              linksFound: result.linksFound,
              status: result.status,
              category: analysis.category,
              keyDetails: analysis.keyDetails,
              summary: analysis.summary,
              relevance: analysis.relevance
            }
          });
        }
      }
    }

    console.log(`   Found ${urls.size} URLs from crawl (total crawled: ${data.totalCrawled})`);
    return urls;

  } catch (error) {
    console.error(`   ⚠️  Error loading BG-Wiki list: ${error.message}`);
    return new Map();
  }
}

/**
 * Merge URL lists with de-duplication and enhancement
 */
function mergeUrlLists(oldUrls, ffxiUrls, bgwikiUrls) {
  console.log('\n🔗 Merging and de-duplicating URL lists...');

  const merged = new Map();
  const sourcesTracking = new Map();

  // Priority: BG-Wiki (most detailed) > Old List (curated) > FFXIclopedia
  const sources = [
    { name: 'New-URL-list.json', urls: bgwikiUrls, priority: 1 },
    { name: 'url-list.json', urls: oldUrls, priority: 2 },
    { name: 'NewFFXIClopedia.json', urls: ffxiUrls, priority: 3 }
  ];

  for (const { name, urls, priority } of sources) {
    for (const [url, data] of urls.entries()) {
      if (!merged.has(url)) {
        // First time seeing this URL
        merged.set(url, { ...data, sources: [name] });
        sourcesTracking.set(url, [{ source: name, priority, data }]);
      } else {
        // URL already exists, merge data
        const existing = merged.get(url);
        const tracking = sourcesTracking.get(url);

        // Add source
        if (!existing.sources.includes(name)) {
          existing.sources.push(name);
        }

        // Track all sources
        tracking.push({ source: name, priority, data });

        // Enhance with better data
        if (!existing.title && data.title) {
          existing.title = data.title;
        }

        // Merge categories
        const allCategories = new Set([...existing.categories, ...data.categories]);
        existing.categories = Array.from(allCategories);

        // If current source has higher priority (lower number), prefer its metadata
        if (priority < (existing.priority || Infinity)) {
          existing.priority = priority;
          existing.primarySource = name;

          // Merge metadata, keeping the best from each
          existing.metadata = {
            ...existing.metadata,
            ...data.metadata
          };
        }
      }
    }
  }

  console.log(`   Merged ${merged.size} unique URLs`);
  console.log(`   From ${oldUrls.size + ffxiUrls.size + bgwikiUrls.size} total URLs`);

  return { merged, sourcesTracking };
}

/**
 * Generate statistics
 */
function generateStats(merged, sourcesTracking, oldUrls, ffxiUrls, bgwikiUrls) {
  const stats = {
    timestamp: new Date().toISOString(),
    totalUnique: merged.size,
    sources: {
      'url-list.json': {
        total: oldUrls.size,
        unique: 0
      },
      'NewFFXIClopedia.json': {
        total: ffxiUrls.size,
        unique: 0
      },
      'New-URL-list.json': {
        total: bgwikiUrls.size,
        unique: 0
      }
    },
    byDomain: {},
    byCategory: {},
    byType: {},
    duplicates: {
      foundInAll3: 0,
      foundIn2: 0,
      foundIn1: 0
    }
  };

  // Count unique URLs per source and other stats
  for (const [url, data] of merged.entries()) {
    // Domain stats
    const domain = extractDomain(url);
    stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;

    // Type stats
    stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;

    // Category stats
    for (const category of data.categories) {
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    // Source stats
    const sourceCount = data.sources.length;
    if (sourceCount === 3) {
      stats.duplicates.foundInAll3++;
    } else if (sourceCount === 2) {
      stats.duplicates.foundIn2++;
    } else {
      stats.duplicates.foundIn1++;
    }

    // Count unique per source
    for (const source of data.sources) {
      if (stats.sources[source]) {
        stats.sources[source].unique++;
      }
    }
  }

  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 URL List Merger and Enhancer\n');

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Load all URL lists
    const oldUrls = await loadOldUrlList();
    const ffxiUrls = await loadFFXIclopediaList();
    const bgwikiUrls = await loadBGWikiList();

    // Merge and de-duplicate
    const { merged, sourcesTracking } = mergeUrlLists(oldUrls, ffxiUrls, bgwikiUrls);

    // Generate statistics
    const stats = generateStats(merged, sourcesTracking, oldUrls, ffxiUrls, bgwikiUrls);

    // Convert to arrays for output
    const unifiedUrls = Array.from(merged.values()).sort((a, b) => {
      // Sort by domain, then category, then URL
      const domainA = extractDomain(a.url);
      const domainB = extractDomain(b.url);
      if (domainA !== domainB) return domainA.localeCompare(domainB);

      const catA = a.categories[0] || 'zzz';
      const catB = b.categories[0] || 'zzz';
      if (catA !== catB) return catA.localeCompare(catB);

      return a.url.localeCompare(b.url);
    });

    const sourceTrackingArray = Array.from(sourcesTracking.entries()).map(([url, sources]) => ({
      url,
      sources: sources.map(s => ({
        source: s.source,
        priority: s.priority
      }))
    }));

    // Save outputs
    console.log('\n💾 Saving outputs...');

    await fs.writeFile(
      UNIFIED_OUTPUT,
      JSON.stringify({
        metadata: {
          generated: new Date().toISOString(),
          totalUrls: unifiedUrls.length,
          sources: ['url-list.json', 'NewFFXIClopedia.json', 'New-URL-list.json']
        },
        urls: unifiedUrls
      }, null, 2),
      'utf-8'
    );
    console.log(`   ✅ Unified URLs: ${UNIFIED_OUTPUT}`);

    await fs.writeFile(
      SOURCE_TRACKING,
      JSON.stringify({
        metadata: {
          generated: new Date().toISOString(),
          description: 'Source tracking for each URL in unified list'
        },
        tracking: sourceTrackingArray
      }, null, 2),
      'utf-8'
    );
    console.log(`   ✅ Source tracking: ${SOURCE_TRACKING}`);

    await fs.writeFile(
      STATS_OUTPUT,
      JSON.stringify(stats, null, 2),
      'utf-8'
    );
    console.log(`   ✅ Statistics: ${STATS_OUTPUT}`);

    // Display summary
    console.log('\n📊 Merge Summary:\n');
    console.log(`Total Unique URLs: ${stats.totalUnique}`);
    console.log(`\nBy Source:`);
    for (const [source, data] of Object.entries(stats.sources)) {
      console.log(`  ${source}:`);
      console.log(`    Total: ${data.total}`);
      console.log(`    Unique: ${data.unique}`);
    }

    console.log(`\nBy Domain:`);
    for (const [domain, count] of Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${domain}: ${count}`);
    }

    console.log(`\nBy Category:`);
    for (const [category, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category}: ${count}`);
    }

    console.log(`\nDuplication:`);
    console.log(`  Found in all 3 sources: ${stats.duplicates.foundInAll3}`);
    console.log(`  Found in 2 sources: ${stats.duplicates.foundIn2}`);
    console.log(`  Found in 1 source: ${stats.duplicates.foundIn1}`);

    console.log('\n✅ URL list merge complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { mergeUrlLists, categorizeUrl, normalizeUrl };
