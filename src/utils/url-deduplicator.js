/**
 * URL List Deduplicator
 *
 * Removes duplicate URLs from url-list.json:
 * - Within each mission set
 * - Across all mission sets (keeps first occurrence)
 * - Within categoryPages arrays
 */

import fs from 'fs/promises';
import path from 'path';

const URL_LIST_FILE = path.join(process.cwd(), 'url-list.json');

/**
 * Load URL list
 */
async function loadURLList() {
  const content = await fs.readFile(URL_LIST_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save URL list
 */
async function saveURLList(urlList) {
  await fs.writeFile(URL_LIST_FILE, JSON.stringify(urlList, null, 2), 'utf-8');
}

/**
 * Deduplicate URLs within each mission set
 */
function deduplicateWithinSets(urlList) {
  let totalRemoved = 0;

  for (const [setId, setData] of Object.entries(urlList)) {
    // Deduplicate categoryPages
    const originalCategoryCount = setData.categoryPages.length;
    setData.categoryPages = [...new Set(setData.categoryPages)];
    const categoryDupes = originalCategoryCount - setData.categoryPages.length;

    // Deduplicate missionPages
    const originalMissionCount = setData.missionPages.length;
    setData.missionPages = [...new Set(setData.missionPages)];
    const missionDupes = originalMissionCount - setData.missionPages.length;

    const setDupes = categoryDupes + missionDupes;
    if (setDupes > 0) {
      console.log(`  ${setId}: Removed ${setDupes} duplicates (${categoryDupes} category, ${missionDupes} mission)`);
      totalRemoved += setDupes;
    }
  }

  return totalRemoved;
}

/**
 * Deduplicate URLs across all mission sets
 * Keep the first occurrence, remove from subsequent sets
 */
function deduplicateAcrossSets(urlList) {
  const globalUrlMap = new Map(); // url -> { setId, type: 'category' | 'mission' }
  let totalRemoved = 0;

  // First pass: build map of all URLs
  for (const [setId, setData] of Object.entries(urlList)) {
    for (const url of setData.categoryPages) {
      if (!globalUrlMap.has(url)) {
        globalUrlMap.set(url, { setId, type: 'category' });
      }
    }
    for (const url of setData.missionPages) {
      if (!globalUrlMap.has(url)) {
        globalUrlMap.set(url, { setId, type: 'mission' });
      }
    }
  }

  // Second pass: remove duplicates from subsequent sets
  for (const [setId, setData] of Object.entries(urlList)) {
    const categoryRemoved = [];
    const missionRemoved = [];

    // Check categoryPages
    setData.categoryPages = setData.categoryPages.filter(url => {
      const owner = globalUrlMap.get(url);
      if (owner.setId !== setId) {
        categoryRemoved.push({ url, owner: owner.setId });
        return false;
      }
      return true;
    });

    // Check missionPages
    setData.missionPages = setData.missionPages.filter(url => {
      const owner = globalUrlMap.get(url);
      if (owner.setId !== setId) {
        missionRemoved.push({ url, owner: owner.setId });
        return false;
      }
      return true;
    });

    const setRemoved = categoryRemoved.length + missionRemoved.length;
    if (setRemoved > 0) {
      console.log(`  ${setId}: Removed ${setRemoved} cross-set duplicates`);
      categoryRemoved.forEach(({ url, owner }) => {
        console.log(`    - Category: ${url} (kept in ${owner})`);
      });
      missionRemoved.forEach(({ url, owner }) => {
        console.log(`    - Mission: ${url} (kept in ${owner})`);
      });
      totalRemoved += setRemoved;
    }
  }

  return totalRemoved;
}

/**
 * Analyze and report on URL statistics
 */
function analyzeURLList(urlList) {
  const stats = {
    totalSets: Object.keys(urlList).length,
    totalCategoryPages: 0,
    totalMissionPages: 0,
    totalURLs: 0,
    sets: {},
  };

  for (const [setId, setData] of Object.entries(urlList)) {
    const categoryCount = setData.categoryPages.length;
    const missionCount = setData.missionPages.length;

    stats.sets[setId] = {
      name: setData.name,
      categoryPages: categoryCount,
      missionPages: missionCount,
      total: categoryCount + missionCount,
    };

    stats.totalCategoryPages += categoryCount;
    stats.totalMissionPages += missionCount;
    stats.totalURLs += categoryCount + missionCount;
  }

  return stats;
}

/**
 * Print statistics
 */
function printStats(stats, title = 'URL List Statistics') {
  console.log(`\n📊 ${title}\n`);
  console.log(`Total mission sets: ${stats.totalSets}`);
  console.log(`Total category pages: ${stats.totalCategoryPages}`);
  console.log(`Total mission pages: ${stats.totalMissionPages}`);
  console.log(`Total URLs: ${stats.totalURLs}\n`);

  console.log('Per-set breakdown:');
  for (const [setId, setStats] of Object.entries(stats.sets)) {
    console.log(`  ${setId}:`);
    console.log(`    Name: ${setStats.name}`);
    console.log(`    Category pages: ${setStats.categoryPages}`);
    console.log(`    Mission pages: ${setStats.missionPages}`);
    console.log(`    Total: ${setStats.total}`);
  }
  console.log('');
}

/**
 * Main deduplication function
 */
async function deduplicate(options = {}) {
  const { verbose = true, dryRun = false } = options;

  console.log('\n🔍 Loading URL list...\n');
  const urlList = await loadURLList();

  if (verbose) {
    const beforeStats = analyzeURLList(urlList);
    printStats(beforeStats, 'Before Deduplication');
  }

  console.log('🧹 Deduplicating URLs...\n');
  console.log('Step 1: Removing duplicates within each set...');
  const withinSetRemoved = deduplicateWithinSets(urlList);
  console.log(withinSetRemoved > 0 ? `  ✓ Removed ${withinSetRemoved} duplicates\n` : '  ✓ No duplicates found\n');

  console.log('Step 2: Removing duplicates across sets...');
  const acrossSetRemoved = deduplicateAcrossSets(urlList);
  console.log(acrossSetRemoved > 0 ? `  ✓ Removed ${acrossSetRemoved} duplicates\n` : '  ✓ No duplicates found\n');

  const totalRemoved = withinSetRemoved + acrossSetRemoved;

  if (verbose) {
    const afterStats = analyzeURLList(urlList);
    printStats(afterStats, 'After Deduplication');
  }

  console.log(`\n📋 Summary:`);
  console.log(`  Total duplicates removed: ${totalRemoved}`);
  console.log(`    - Within sets: ${withinSetRemoved}`);
  console.log(`    - Across sets: ${acrossSetRemoved}`);

  if (dryRun) {
    console.log(`\n⚠️  Dry run mode - no changes saved`);
  } else {
    await saveURLList(urlList);
    console.log(`\n✓ Saved deduplicated URL list to ${URL_LIST_FILE}`);
  }

  return { totalRemoved, withinSetRemoved, acrossSetRemoved };
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'deduplicate':
      case 'dedup':
        await deduplicate({ verbose: true, dryRun: false });
        break;

      case 'dry-run':
        await deduplicate({ verbose: true, dryRun: true });
        break;

      case 'stats':
        const urlList = await loadURLList();
        const stats = analyzeURLList(urlList);
        printStats(stats);
        break;

      default:
        console.log('\n🧹 URL Deduplicator\n');
        console.log('Commands:');
        console.log('  deduplicate  - Remove duplicate URLs from url-list.json');
        console.log('  dedup        - Alias for deduplicate');
        console.log('  dry-run      - Show what would be removed without saving');
        console.log('  stats        - Show URL statistics');
        console.log('\nExamples:');
        console.log('  node src/utils/url-deduplicator.js deduplicate');
        console.log('  node src/utils/url-deduplicator.js dry-run');
        console.log('  node src/utils/url-deduplicator.js stats');
        console.log('');
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

export { deduplicate, analyzeURLList };
