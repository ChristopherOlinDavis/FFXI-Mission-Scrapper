/**
 * HTML File Deduplicator
 *
 * Removes duplicate and orphaned HTML files from outputHTMLs/:
 * - Files for URLs no longer in url-list.json (orphaned)
 * - Files with identical content (duplicate downloads)
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { urlToFilename, loadURLList, getAllURLs } from './download-manager.js';

const OUTPUT_DIR = path.join(process.cwd(), 'outputHTMLs');

/**
 * Calculate MD5 hash of file content
 */
async function getFileHash(filepath) {
  const content = await fs.readFile(filepath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get all HTML files in outputHTMLs/
 */
async function getAllHTMLFiles() {
  const files = await fs.readdir(OUTPUT_DIR);
  return files
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(OUTPUT_DIR, file));
}

/**
 * Find orphaned files (files for URLs not in url-list.json)
 */
async function findOrphanedFiles() {
  console.log('\n🔍 Scanning for orphaned files...\n');

  const urlList = await loadURLList();
  const allValidUrls = getAllURLs(urlList);
  const validFilenames = new Set(allValidUrls.map(url => urlToFilename(url)));

  const allFiles = await getAllHTMLFiles();
  const orphaned = [];

  for (const filepath of allFiles) {
    const filename = path.basename(filepath);
    if (!validFilenames.has(filename)) {
      const stats = await fs.stat(filepath);
      orphaned.push({
        filepath,
        filename,
        size: stats.size,
      });
    }
  }

  return orphaned;
}

/**
 * Find duplicate files (same content, different names)
 */
async function findDuplicateFiles() {
  console.log('\n🔍 Scanning for duplicate files (by content hash)...\n');

  const allFiles = await getAllHTMLFiles();
  const hashMap = new Map(); // hash -> [filepaths]
  const duplicates = [];

  let processed = 0;
  for (const filepath of allFiles) {
    const hash = await getFileHash(filepath);

    if (!hashMap.has(hash)) {
      hashMap.set(hash, []);
    }
    hashMap.get(hash).push(filepath);

    processed++;
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${allFiles.length} files...`);
    }
  }

  console.log(`  ✓ Processed ${allFiles.length} files\n`);

  // Find groups with multiple files
  for (const [hash, filepaths] of hashMap.entries()) {
    if (filepaths.length > 1) {
      const stats = await fs.stat(filepaths[0]);
      duplicates.push({
        hash,
        count: filepaths.length,
        size: stats.size,
        files: filepaths.map(fp => path.basename(fp)),
        filepaths,
      });
    }
  }

  return duplicates;
}

/**
 * Remove orphaned files
 */
async function removeOrphanedFiles(orphaned, dryRun = false) {
  if (orphaned.length === 0) {
    console.log('  ✓ No orphaned files found\n');
    return 0;
  }

  console.log(`\n🗑️  Found ${orphaned.length} orphaned files:\n`);

  let totalSize = 0;
  for (const file of orphaned) {
    console.log(`  - ${file.filename} (${file.size} bytes)`);
    totalSize += file.size;
  }

  console.log(`\n  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (!dryRun) {
    console.log('\n  Removing orphaned files...');
    for (const file of orphaned) {
      await fs.unlink(file.filepath);
    }
    console.log(`  ✓ Removed ${orphaned.length} orphaned files\n`);
  } else {
    console.log('\n  ⚠️  Dry run - files not removed\n');
  }

  return orphaned.length;
}

/**
 * Remove duplicate files (keep first, remove rest)
 */
async function removeDuplicateFiles(duplicates, dryRun = false) {
  if (duplicates.length === 0) {
    console.log('  ✓ No duplicate files found\n');
    return 0;
  }

  console.log(`\n🗑️  Found ${duplicates.length} groups of duplicate files:\n`);

  let totalToRemove = 0;
  let totalSizeSaved = 0;

  for (const dup of duplicates) {
    console.log(`  Group (hash: ${dup.hash.substring(0, 8)}...):`);
    console.log(`    Files: ${dup.count}`);
    console.log(`    Size each: ${dup.size} bytes`);
    console.log(`    Keep: ${dup.files[0]}`);
    console.log(`    Remove:`);
    for (let i = 1; i < dup.files.length; i++) {
      console.log(`      - ${dup.files[i]}`);
    }
    console.log('');

    totalToRemove += dup.count - 1;
    totalSizeSaved += dup.size * (dup.count - 1);
  }

  console.log(`  Total files to remove: ${totalToRemove}`);
  console.log(`  Total size to save: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB\n`);

  if (!dryRun) {
    console.log('  Removing duplicate files...');
    for (const dup of duplicates) {
      // Keep first file, remove rest
      for (let i = 1; i < dup.filepaths.length; i++) {
        await fs.unlink(dup.filepaths[i]);
      }
    }
    console.log(`  ✓ Removed ${totalToRemove} duplicate files\n`);
  } else {
    console.log('  ⚠️  Dry run - files not removed\n');
  }

  return totalToRemove;
}

/**
 * Get statistics about HTML files
 */
async function getStats() {
  const allFiles = await getAllHTMLFiles();
  let totalSize = 0;

  for (const filepath of allFiles) {
    const stats = await fs.stat(filepath);
    totalSize += stats.size;
  }

  return {
    count: allFiles.length,
    totalSize,
    averageSize: totalSize / allFiles.length,
  };
}

/**
 * Main deduplication function
 */
async function deduplicate(options = {}) {
  const { dryRun = false, orphanedOnly = false, duplicatesOnly = false } = options;

  console.log('\n🧹 HTML File Deduplicator\n');

  // Get initial stats
  const beforeStats = await getStats();
  console.log('📊 Current state:');
  console.log(`  Total files: ${beforeStats.count}`);
  console.log(`  Total size: ${(beforeStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Average size: ${(beforeStats.averageSize / 1024).toFixed(2)} KB\n`);

  let orphanedRemoved = 0;
  let duplicatesRemoved = 0;

  // Find and remove orphaned files
  if (!duplicatesOnly) {
    const orphaned = await findOrphanedFiles();
    orphanedRemoved = await removeOrphanedFiles(orphaned, dryRun);
  }

  // Find and remove duplicate files
  if (!orphanedOnly) {
    const duplicates = await findDuplicateFiles();
    duplicatesRemoved = await removeDuplicateFiles(duplicates, dryRun);
  }

  // Get final stats
  if (!dryRun) {
    const afterStats = await getStats();
    const sizeSaved = beforeStats.totalSize - afterStats.totalSize;

    console.log('📊 After cleanup:');
    console.log(`  Total files: ${afterStats.count}`);
    console.log(`  Total size: ${(afterStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Size saved: ${(sizeSaved / 1024 / 1024).toFixed(2)} MB\n`);
  }

  console.log('📋 Summary:');
  console.log(`  Orphaned files removed: ${orphanedRemoved}`);
  console.log(`  Duplicate files removed: ${duplicatesRemoved}`);
  console.log(`  Total files removed: ${orphanedRemoved + duplicatesRemoved}\n`);

  if (dryRun) {
    console.log('⚠️  Dry run mode - no files were actually removed\n');
  }

  return { orphanedRemoved, duplicatesRemoved };
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
        await deduplicate({ dryRun: false });
        break;

      case 'dry-run':
        await deduplicate({ dryRun: true });
        break;

      case 'orphaned':
        await deduplicate({ dryRun: false, orphanedOnly: true });
        break;

      case 'duplicates':
        await deduplicate({ dryRun: false, duplicatesOnly: true });
        break;

      case 'stats':
        const stats = await getStats();
        console.log('\n📊 HTML Files Statistics\n');
        console.log(`Total files: ${stats.count}`);
        console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Average size: ${(stats.averageSize / 1024).toFixed(2)} KB\n`);
        break;

      case 'orphaned-list':
        const orphaned = await findOrphanedFiles();
        if (orphaned.length === 0) {
          console.log('✓ No orphaned files found\n');
        } else {
          console.log(`Found ${orphaned.length} orphaned files:\n`);
          orphaned.forEach(file => {
            console.log(`  ${file.filename}`);
          });
          console.log('');
        }
        break;

      case 'duplicates-list':
        const duplicates = await findDuplicateFiles();
        if (duplicates.length === 0) {
          console.log('✓ No duplicate files found\n');
        } else {
          console.log(`Found ${duplicates.length} groups of duplicates:\n`);
          duplicates.forEach((dup, i) => {
            console.log(`Group ${i + 1}:`);
            dup.files.forEach(file => {
              console.log(`  - ${file}`);
            });
            console.log('');
          });
        }
        break;

      default:
        console.log('\n🧹 HTML File Deduplicator\n');
        console.log('Commands:');
        console.log('  deduplicate      - Remove orphaned and duplicate HTML files');
        console.log('  dedup            - Alias for deduplicate');
        console.log('  dry-run          - Show what would be removed without deleting');
        console.log('  orphaned         - Remove only orphaned files');
        console.log('  duplicates       - Remove only duplicate files');
        console.log('  orphaned-list    - List orphaned files');
        console.log('  duplicates-list  - List duplicate files');
        console.log('  stats            - Show HTML file statistics');
        console.log('\nExamples:');
        console.log('  node src/utils/html-deduplicator.js dry-run');
        console.log('  node src/utils/html-deduplicator.js deduplicate');
        console.log('  node src/utils/html-deduplicator.js orphaned');
        console.log('  node src/utils/html-deduplicator.js stats');
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

export { deduplicate, findOrphanedFiles, findDuplicateFiles };
