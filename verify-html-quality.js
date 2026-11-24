#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyHtmlQuality() {
  console.log('\n' + '='.repeat(80));
  console.log('HTML FILE QUALITY VERIFICATION');
  console.log('='.repeat(80) + '\n');

  const outputDir = path.join(__dirname, 'output');
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.html'));

  console.log(`Total HTML files: ${files.length}\n`);

  // Categorize by source and size
  const stats = {
    bgwiki: { total: 0, tiny: 0, small: 0, medium: 0, large: 0, sizes: [] },
    ffxiclopedia: { total: 0, tiny: 0, small: 0, medium: 0, large: 0, sizes: [] }
  };

  for (const file of files) {
    const filePath = path.join(outputDir, file);
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const source = file.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia';

    stats[source].total++;
    stats[source].sizes.push(size);

    // Categorize by size
    if (size < 1000) {
      stats[source].tiny++; // Error pages, redirects
    } else if (size < 10000) {
      stats[source].small++; // Minimal content
    } else if (size < 100000) {
      stats[source].medium++; // Normal pages
    } else {
      stats[source].large++; // Large pages
    }
  }

  // Calculate statistics
  const calculateStats = (sizes) => {
    if (sizes.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };

    const sorted = [...sizes].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return { min, max, avg, median };
  };

  console.log('='.repeat(80));
  console.log('BGWIKI FILES');
  console.log('='.repeat(80) + '\n');

  const bgStats = calculateStats(stats.bgwiki.sizes);
  console.log(`Total Files: ${stats.bgwiki.total}`);
  console.log(`\nSize Distribution:`);
  console.log(`  Tiny (<1KB):      ${stats.bgwiki.tiny.toString().padStart(5)} (${((stats.bgwiki.tiny/stats.bgwiki.total)*100).toFixed(1)}%) - Likely errors`);
  console.log(`  Small (1-10KB):   ${stats.bgwiki.small.toString().padStart(5)} (${((stats.bgwiki.small/stats.bgwiki.total)*100).toFixed(1)}%) - Minimal content`);
  console.log(`  Medium (10-100KB):${stats.bgwiki.medium.toString().padStart(5)} (${((stats.bgwiki.medium/stats.bgwiki.total)*100).toFixed(1)}%) - Normal pages`);
  console.log(`  Large (>100KB):   ${stats.bgwiki.large.toString().padStart(5)} (${((stats.bgwiki.large/stats.bgwiki.total)*100).toFixed(1)}%) - Large pages`);
  console.log(`\nSize Statistics:`);
  console.log(`  Min:     ${(bgStats.min/1024).toFixed(1)} KB`);
  console.log(`  Max:     ${(bgStats.max/1024).toFixed(1)} KB`);
  console.log(`  Average: ${(bgStats.avg/1024).toFixed(1)} KB`);
  console.log(`  Median:  ${(bgStats.median/1024).toFixed(1)} KB`);

  console.log('\n' + '='.repeat(80));
  console.log('FFXICLOPEDIA FILES');
  console.log('='.repeat(80) + '\n');

  const ffxiStats = calculateStats(stats.ffxiclopedia.sizes);
  console.log(`Total Files: ${stats.ffxiclopedia.total}`);
  console.log(`\nSize Distribution:`);
  console.log(`  Tiny (<1KB):      ${stats.ffxiclopedia.tiny.toString().padStart(5)} (${((stats.ffxiclopedia.tiny/stats.ffxiclopedia.total)*100).toFixed(1)}%) - Likely errors`);
  console.log(`  Small (1-10KB):   ${stats.ffxiclopedia.small.toString().padStart(5)} (${((stats.ffxiclopedia.small/stats.ffxiclopedia.total)*100).toFixed(1)}%) - Minimal content`);
  console.log(`  Medium (10-100KB):${stats.ffxiclopedia.medium.toString().padStart(5)} (${((stats.ffxiclopedia.medium/stats.ffxiclopedia.total)*100).toFixed(1)}%) - Normal pages`);
  console.log(`  Large (>100KB):   ${stats.ffxiclopedia.large.toString().padStart(5)} (${((stats.ffxiclopedia.large/stats.ffxiclopedia.total)*100).toFixed(1)}%) - Large pages`);
  console.log(`\nSize Statistics:`);
  console.log(`  Min:     ${(ffxiStats.min/1024).toFixed(1)} KB`);
  console.log(`  Max:     ${(ffxiStats.max/1024).toFixed(1)} KB`);
  console.log(`  Average: ${(ffxiStats.avg/1024).toFixed(1)} KB`);
  console.log(`  Median:  ${(ffxiStats.median/1024).toFixed(1)} KB`);

  // Sample error pages
  console.log('\n' + '='.repeat(80));
  console.log('SAMPLE TINY FILES (Likely Errors)');
  console.log('='.repeat(80) + '\n');

  const tinyFiles = files
    .map(f => ({ name: f, size: fs.statSync(path.join(outputDir, f)).size }))
    .filter(f => f.size < 1000)
    .sort((a, b) => a.size - b.size)
    .slice(0, 10);

  tinyFiles.forEach(f => {
    console.log(`${f.name.substring(0, 60).padEnd(60)} ${f.size.toString().padStart(5)} bytes`);
  });

  // Check content of a few tiny files
  if (tinyFiles.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE TINY FILE CONTENT');
    console.log('='.repeat(80) + '\n');

    const sampleFile = path.join(outputDir, tinyFiles[0].name);
    const content = fs.readFileSync(sampleFile, 'utf-8');
    console.log(`File: ${tinyFiles[0].name}`);
    console.log(`Size: ${tinyFiles[0].size} bytes`);
    console.log('\nContent:');
    console.log(content.substring(0, 500));
    if (content.length > 500) {
      console.log('\n... (truncated)');
    }
  }

  // Quality score
  console.log('\n' + '='.repeat(80));
  console.log('QUALITY ASSESSMENT');
  console.log('='.repeat(80) + '\n');

  const bgQuality = ((stats.bgwiki.medium + stats.bgwiki.large) / stats.bgwiki.total) * 100;
  const ffxiQuality = ((stats.ffxiclopedia.medium + stats.ffxiclopedia.large) / stats.ffxiclopedia.total) * 100;

  console.log(`BGWiki Quality Score:       ${bgQuality.toFixed(1)}% (medium+ size files)`);
  console.log(`FFXIClopedia Quality Score: ${ffxiQuality.toFixed(1)}% (medium+ size files)`);

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  if (bgQuality > 70) {
    console.log('✅ BGWiki files have GOOD quality');
    console.log('   → Proceed with parser enhancements for BGWiki content');
  } else {
    console.log('⚠️  BGWiki files have questionable quality');
    console.log('   → Review and possibly re-download BGWiki content');
  }

  if (ffxiQuality > 70) {
    console.log('✅ FFXIClopedia files have GOOD quality');
    console.log('   → Proceed with parser enhancements for FFXIClopedia content');
  } else {
    console.log('⚠️  FFXIClopedia files have POOR quality');
    console.log('   → Many files appear to be errors or redirects');
    console.log('   → Recommend re-downloading FFXIClopedia content');
  }

  console.log('\n' + '='.repeat(80));
  console.log('USABLE FILES');
  console.log('='.repeat(80) + '\n');

  const usableBG = stats.bgwiki.medium + stats.bgwiki.large;
  const usableFFXI = stats.ffxiclopedia.medium + stats.ffxiclopedia.large;
  const totalUsable = usableBG + usableFFXI;

  console.log(`BGWiki Usable Files:       ${usableBG.toString().padStart(5)} / ${stats.bgwiki.total.toString().padStart(5)} (${bgQuality.toFixed(1)}%)`);
  console.log(`FFXIClopedia Usable Files: ${usableFFXI.toString().padStart(5)} / ${stats.ffxiclopedia.total.toString().padStart(5)} (${ffxiQuality.toFixed(1)}%)`);
  console.log(`Total Usable Files:        ${totalUsable.toString().padStart(5)} / ${files.length.toString().padStart(5)} (${((totalUsable/files.length)*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80) + '\n');

  // Save results
  const results = {
    summary: {
      totalFiles: files.length,
      usableFiles: totalUsable,
      usablePercent: ((totalUsable/files.length)*100).toFixed(1)
    },
    bgwiki: {
      ...stats.bgwiki,
      quality: bgQuality.toFixed(1),
      stats: bgStats
    },
    ffxiclopedia: {
      ...stats.ffxiclopedia,
      quality: ffxiQuality.toFixed(1),
      stats: ffxiStats
    }
  };

  const resultsPath = path.join(__dirname, 'html-quality-report.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📊 Results saved to: html-quality-report.json\n`);
}

verifyHtmlQuality().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
