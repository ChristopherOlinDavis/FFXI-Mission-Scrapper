#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JobParserEnhanced } from './src/parsers/job-parser-enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Batch re-parse all job HTML files with the enhanced parser
 */
async function batchReparseJobs() {
  const htmlDir = path.join(__dirname, 'output');
  const outputDir = path.join(__dirname, 'parsed_output', 'jobs-enhanced');

  console.log(`\n${'='.repeat(80)}`);
  console.log('BATCH JOB RE-PARSER - ENHANCED VERSION');
  console.log(`${'='.repeat(80)}\n`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}\n`);
  }

  // Find all HTML files in the output directory
  const allFiles = fs.readdirSync(htmlDir);

  // Filter for potential job files
  const jobPatterns = [
    /bgwiki-(Warrior|Monk|White_Mage|Black_Mage|Red_Mage|Thief)\.html$/,
    /bgwiki-(Paladin|Dark_Knight|Beastmaster|Bard|Ranger|Samurai)\.html$/,
    /bgwiki-(Ninja|Dragoon|Summoner|Blue_Mage|Corsair|Puppetmaster)\.html$/,
    /bgwiki-(Dancer|Scholar|Geomancer|Rune_Fencer)\.html$/,
    /ffxiclopedia-(Warrior|Monk|White_Mage|Black_Mage|Red_Mage|Thief)\.html$/,
    /ffxiclopedia-(Paladin|Dark_Knight|Beastmaster|Bard|Ranger|Samurai)\.html$/,
    /ffxiclopedia-(Ninja|Dragoon|Summoner|Blue_Mage|Corsair|Puppetmaster)\.html$/,
    /ffxiclopedia-(Dancer|Scholar|Geomancer|Rune_Fencer)\.html$/
  ];

  const jobFiles = allFiles.filter(file =>
    jobPatterns.some(pattern => pattern.test(file))
  );

  if (jobFiles.length === 0) {
    console.log('❌ No job HTML files found in output directory');
    return;
  }

  console.log(`Found ${jobFiles.length} job HTML files to parse:\n`);

  const parser = new JobParserEnhanced();
  const results = {
    success: [],
    failed: [],
    stats: {
      totalJobs: 0,
      totalAbilities: 0,
      totalTraits: 0,
      totalJobPoints: 0,
      totalJobPointGifts: 0
    }
  };

  for (const filename of jobFiles) {
    const htmlPath = path.join(htmlDir, filename);
    const jobName = filename.replace(/^(bgwiki|ffxiclopedia)-/, '').replace(/\.html$/, '').replace(/_/g, ' ');

    try {
      console.log(`\nParsing: ${jobName} (${filename})...`);

      const html = fs.readFileSync(htmlPath, 'utf-8');
      const sourceUrl = `https://www.bg-wiki.com/ffxi/${jobName.replace(/ /g, '_')}`;

      const jobData = parser.parse(html, sourceUrl, filename);

      if (jobData) {
        // Save to output
        const outputFilename = filename.replace('.html', '.json');
        const outputPath = path.join(outputDir, outputFilename);
        fs.writeFileSync(outputPath, JSON.stringify(jobData, null, 2));

        // Track stats
        results.stats.totalJobs++;
        results.stats.totalAbilities += jobData.abilities?.length || 0;
        results.stats.totalTraits += jobData.traits?.length || 0;
        results.stats.totalJobPoints += jobData.jobPoints?.length || 0;
        results.stats.totalJobPointGifts += jobData.jobPointGifts?.length || 0;

        results.success.push({
          filename,
          jobName: jobData.name,
          abbreviation: jobData.abbreviation,
          abilities: jobData.abilities?.length || 0,
          traits: jobData.traits?.length || 0,
          jobPoints: jobData.jobPoints?.length || 0,
          jobPointGifts: jobData.jobPointGifts?.length || 0
        });

        console.log(`  ✅ Success!`);
        console.log(`     - Abilities: ${jobData.abilities?.length || 0}`);
        console.log(`     - Traits: ${jobData.traits?.length || 0}`);
        console.log(`     - Job Points: ${jobData.jobPoints?.length || 0}`);
        console.log(`     - JP Gifts: ${jobData.jobPointGifts?.length || 0}`);
      } else {
        console.log(`  ⚠️  Skipped (not detected as job page)`);
        results.failed.push({ filename, reason: 'Not detected as job page' });
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results.failed.push({ filename, reason: error.message });
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('BATCH PARSING SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Total Files Processed: ${jobFiles.length}`);
  console.log(`Successful Parses: ${results.success.length}`);
  console.log(`Failed/Skipped: ${results.failed.length}`);

  console.log(`\nAggregated Stats:`);
  console.log(`  Total Jobs: ${results.stats.totalJobs}`);
  console.log(`  Total Abilities: ${results.stats.totalAbilities}`);
  console.log(`  Total Traits: ${results.stats.totalTraits}`);
  console.log(`  Total Job Points: ${results.stats.totalJobPoints}`);
  console.log(`  Total JP Gifts: ${results.stats.totalJobPointGifts}`);
  console.log(`  Total Items: ${results.stats.totalAbilities + results.stats.totalTraits + results.stats.totalJobPoints + results.stats.totalJobPointGifts}`);

  if (results.success.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUCCESSFULLY PARSED JOBS');
    console.log(`${'='.repeat(80)}\n`);

    results.success.forEach((job, i) => {
      console.log(`${i + 1}. ${job.jobName} (${job.abbreviation || '???'})`);
      console.log(`   - File: ${job.filename}`);
      console.log(`   - Abilities: ${job.abilities}, Traits: ${job.traits}, JP: ${job.jobPoints}, Gifts: ${job.jobPointGifts}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('FAILED/SKIPPED FILES');
    console.log(`${'='.repeat(80)}\n`);

    results.failed.forEach((fail, i) => {
      console.log(`${i + 1}. ${fail.filename}: ${fail.reason}`);
    });
  }

  // Save summary to JSON
  const summaryPath = path.join(outputDir, '_batch-parse-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Batch parsing complete!`);
  console.log(`   Output directory: ${outputDir}`);
  console.log(`   Summary saved to: ${summaryPath}`);
  console.log(`${'='.repeat(80)}\n`);

  return results;
}

batchReparseJobs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
